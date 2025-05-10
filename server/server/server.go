package server

import (
	goContext "context"
	"crypto/tls"
	"errors"
	"fmt"
	"net/http"
	"os"
	"strconv"
	"strings"
	"sync"
	"time"

	"github.com/gorilla/mux"
	"github.com/prometheus/client_golang/prometheus/promhttp"
	"github.com/root-gg/logger"

	"github.com/root-gg/plik/server/common"
	"github.com/root-gg/plik/server/context"
	"github.com/root-gg/plik/server/data"
	"github.com/root-gg/plik/server/data/file"
	"github.com/root-gg/plik/server/data/gcs"
	"github.com/root-gg/plik/server/data/s3"
	"github.com/root-gg/plik/server/data/stream"
	"github.com/root-gg/plik/server/data/swift"
	data_test "github.com/root-gg/plik/server/data/testing"
	"github.com/root-gg/plik/server/handlers"
	"github.com/root-gg/plik/server/metadata"
	"github.com/root-gg/plik/server/middleware"
)

// PlikServer is a Plik Server instance
type PlikServer struct {
	config *common.Configuration

	metadataBackend *metadata.Backend
	dataBackend     data.Backend
	streamBackend   data.Backend

	authenticator *common.SessionAuthenticator

	httpServer        *http.Server
	metricsHTTPServer *http.Server

	metrics     *common.PlikMetrics
	serverStats *common.ServerStats

	mu      sync.Mutex
	started bool
	done    bool
	close   chan struct{}

	cleaningRandomDelay int
	cleaningMinOffset   int
}

// NewPlikServer create a new Plik Server instance
func NewPlikServer(config *common.Configuration) (ps *PlikServer) {
	ps = new(PlikServer)
	ps.config = config

	ps.cleaningRandomDelay = 300
	ps.cleaningMinOffset = 300

	ps.metrics = common.NewPlikMetrics()
	ps.close = make(chan struct{})

	return ps
}

// Start a Plik Server instance
func (ps *PlikServer) Start() (err error) {
	ps.mu.Lock()
	defer ps.mu.Unlock()

	if ps.done {
		return errors.New("can't start a shutdown Plik server")
	}

	if ps.started {
		return errors.New("can't start a Plik server twice")
	}

	// You get only one try
	ps.started = true

	return ps.start()
}

// Start an HTTP server to server Prometheus Metrics
func (ps *PlikServer) startMetricsHTTPServer() {
	log := ps.config.NewLogger()
	if ps.config.MetricsPort <= 0 {
		return
	}

	addr := fmt.Sprintf("%s:%d", ps.config.MetricsAddress, ps.config.MetricsPort)

	ps.metricsHTTPServer = &http.Server{
		Addr:    addr,
		Handler: promhttp.HandlerFor(ps.metrics.GetRegistry(), promhttp.HandlerOpts{}),
	}

	go func() {
		log.Infof("Starting metrics HTTP server at : http://%s", addr)
		err := ps.metricsHTTPServer.ListenAndServe()
		if err != nil {
			log.Fatalf("Unable to start metrics HTTP server : %s", err)
		}
	}()

	go func() {
		select {
		case <-ps.close:
			ps.shutdownMetricsHTTPServer()
		}
	}()
}

func (ps *PlikServer) shutdownMetricsHTTPServer() {
	log := ps.config.NewLogger()
	if ps.metricsHTTPServer == nil {
		return
	}
	err := ps.metricsHTTPServer.Close()
	if err != nil {
		log.Warningf("Unable to shutdown metrics HTTP server : %s", err)
	}
}

func (ps *PlikServer) refreshServerStats() (err error) {
	start := time.Now()
	ps.serverStats, err = ps.metadataBackend.GetServerStatistics()
	if err != nil {
		return err
	}
	elapsed := time.Since(start)
	ps.metrics.UpdateServerStatistics(ps.serverStats, elapsed)
	return nil
}

func (ps *PlikServer) refreshServerStatsRoutine() {
	if ps.config.MetricsPort <= 0 {
		return
	}
	log := ps.config.NewLogger()
	for {
		err := ps.refreshServerStats()
		if err != nil {
			log.Warningf("Unable to refresh server statistics : %s", err)
		}
		select {
		case <-time.After(60 * time.Second):
		case <-ps.close:
			return
		}
	}
}

func (ps *PlikServer) start() (err error) {
	log := ps.config.NewLogger()

	log.Infof("Starting plikd server v" + common.GetBuildInfo().Version)

	log.Debug("Configuration :")
	for _, line := range strings.Split(ps.config.String(), "\n") {
		if line != "" {
			log.Debug(line)
		}
	}

	// Initialize backends
	err = ps.initializeMetadataBackend()
	if err != nil {
		return fmt.Errorf("unable to initialize metadata backend : %s", err)
	}

	err = ps.initializeDataBackend()
	if err != nil {
		return fmt.Errorf("unable to initialize data backend : %s", err)
	}

	err = ps.initializeStreamBackend()
	if err != nil {
		return fmt.Errorf("unable to initialize stream backend : %s", err)
	}

	err = ps.initializeAuthenticator()
	if err != nil {
		return fmt.Errorf("unable to initialize session authenticator : %s", err)
	}

	if ps.config.IsAutoClean() {
		go ps.uploadsCleaningRoutine()
	}

	go ps.refreshServerStatsRoutine()

	handler := ps.getHTTPHandler()

	var proto string
	address := ps.config.ListenAddress + ":" + strconv.Itoa(ps.config.ListenPort)
	if ps.config.SslEnabled {
		proto = "https"
		tlsConfig := &tls.Config{MinVersion: ps.config.GetTlsVersion()}

		if ps.config.SslCert == "" || ps.config.SslKey == "" {
			return fmt.Errorf("unable to start plik server without ssl certificates")
		}

		ps.httpServer = &http.Server{Addr: address, Handler: handler, TLSConfig: tlsConfig}
	} else {
		proto = "http"
		ps.httpServer = &http.Server{Addr: address, Handler: handler}
	}

	log.Infof("Starting server at %s://%s", proto, address)

	// Start HTTP Server
	go func() {
		if ps.config.SslEnabled {
			err = ps.httpServer.ListenAndServeTLS(ps.config.SslCert, ps.config.SslKey)
		} else {
			err = ps.httpServer.ListenAndServe()
		}
		if err != nil {
			ps.mu.Lock()
			defer ps.mu.Unlock()
			if !ps.done {
				log.Fatalf("Unable to start HTTP server : %s", err)
			}
		}
	}()

	ps.startMetricsHTTPServer()

	return nil
}

// Shutdown gracefully shutdown a Plik Server instance with a timeout grace period for connexions to close
func (ps *PlikServer) Shutdown(timeout time.Duration) (err error) {
	ps.mu.Lock()
	defer ps.mu.Unlock()

	if !ps.started {
		return nil
	}

	if ps.done {
		return errors.New("can't shutdown a Plik server twice")
	}

	return ps.shutdown(timeout)
}

// ShutdownNow a Plik Server instance abruptly closing all connection immediately
func (ps *PlikServer) ShutdownNow() (err error) {
	return ps.Shutdown(0)
}

func (ps *PlikServer) shutdown(timeout time.Duration) (err error) {
	log := ps.config.NewLogger()
	log.Info("Shutdown server at " + ps.GetConfig().GetServerURL().String())
	close(ps.close)
	ps.done = true

	err = func() error {
		if ps.httpServer == nil {
			return nil
		}

		if timeout > 0 {
			ctx, cancel := goContext.WithTimeout(goContext.Background(), timeout)
			defer cancel()

			err = ps.httpServer.Shutdown(ctx)
			if err == nil {
				return nil
			}
		}

		return ps.httpServer.Close()
	}()
	if err != nil {
		log.Warningf("unable to shutdown HTTP server : %s", err)
	}

	if ps.metadataBackend != nil {
		err = ps.metadataBackend.Shutdown()
		if err != nil {
			log.Warningf("unable to shutdown metadata backend : %s", err)
		}
	}

	return nil
}

func (ps *PlikServer) getHTTPHandler() (handler http.Handler) {

	// An empty chain just initializing context
	emptyChain := context.NewChain(middleware.Context(ps.setupContext))

	// The base middleware chain
	stdChain := emptyChain.Append(middleware.SourceIP, middleware.Log, middleware.Recover)

	// A chain that authenticates user from session cookies
	authChain := stdChain.Append(middleware.Authenticate(false), middleware.Impersonate)

	// A Chain that authenticates user from session cookie or X-PlikToken header
	tokenChain := stdChain.Append(middleware.Authenticate(true), middleware.Impersonate)

	// A Chain that only allows authenticated users
	authenticatedChain := authChain.Append(middleware.AuthenticatedOnly)

	// A chain that only allows authenticated admin users
	adminChain := stdChain.Append(middleware.Authenticate(false), middleware.AdminOnly)

	// Chains that redirect on error for webapp
	stdChainWithRedirect := context.NewChain(middleware.RedirectOnFailure).AppendChain(stdChain)
	tokenChainWithRedirect := context.NewChain(middleware.RedirectOnFailure).AppendChain(tokenChain)

	// Chain that fetches the requested upload and file metadata
	getFileChain := context.NewChain(middleware.Upload, middleware.File)
	userChain := authenticatedChain.Append(middleware.User)

	// HTTP Api routes configuration
	router := mux.NewRouter()
	router.Handle("/", tokenChain.Append(middleware.CreateUpload).Then(handlers.AddFile)).Methods("POST")

	router.Handle("/config", stdChain.Then(handlers.GetConfiguration)).Methods("GET")
	router.Handle("/version", stdChain.Then(handlers.GetVersion)).Methods("GET")
	router.Handle("/qrcode", stdChain.Then(handlers.GetQrCode)).Methods("GET")
	router.Handle("/health", emptyChain.Then(handlers.Health)).Methods("GET")

	router.Handle("/upload", tokenChain.Then(handlers.CreateUpload)).Methods("POST")
	router.Handle("/upload/{uploadID}", tokenChain.Append(middleware.Upload).Then(handlers.GetUpload)).Methods("GET")
	router.Handle("/upload/{uploadID}", tokenChain.Append(middleware.Upload).Then(handlers.RemoveUpload)).Methods("DELETE")
	router.Handle("/file/{uploadID}", tokenChain.Append(middleware.Upload).Then(handlers.AddFile)).Methods("POST")
	router.Handle("/file/{uploadID}/{fileID}/{filename}", tokenChain.AppendChain(getFileChain).Then(handlers.AddFile)).Methods("POST")
	router.Handle("/file/{uploadID}/{fileID}/{filename}", tokenChain.AppendChain(getFileChain).Then(handlers.RemoveFile)).Methods("DELETE")
	router.Handle("/file/{uploadID}/{fileID}/{filename}", tokenChainWithRedirect.AppendChain(getFileChain).Then(handlers.GetFile)).Methods("HEAD", "GET")
	router.Handle("/stream/{uploadID}/{fileID}/{filename}", tokenChain.AppendChain(getFileChain).Then(handlers.AddFile)).Methods("POST")
	router.Handle("/stream/{uploadID}/{fileID}/{filename}", tokenChainWithRedirect.AppendChain(getFileChain).Then(handlers.GetFile)).Methods("HEAD", "GET")
	router.Handle("/archive/{uploadID}/{filename}", tokenChainWithRedirect.Append(middleware.Upload).Then(handlers.GetArchive)).Methods("HEAD", "GET")

	router.Handle("/auth/google/login", authChain.Then(handlers.GoogleLogin)).Methods("GET")
	router.Handle("/auth/google/callback", stdChainWithRedirect.Then(handlers.GoogleCallback)).Methods("GET")
	router.Handle("/auth/ovh/login", authChain.Then(handlers.OvhLogin)).Methods("GET")
	router.Handle("/auth/ovh/callback", stdChainWithRedirect.Then(handlers.OvhCallback)).Methods("GET")
	router.Handle("/auth/local/login", authChain.Then(handlers.LocalLogin)).Methods("POST")
	router.Handle("/auth/logout", stdChain.Then(handlers.Logout)).Methods("GET")

	router.Handle("/me", authenticatedChain.Then(handlers.UserInfo)).Methods("GET")
	router.Handle("/me", authenticatedChain.Then(handlers.DeleteAccount)).Methods("DELETE")
	router.Handle("/me/token", authenticatedChain.Append(middleware.Paginate).Then(handlers.GetUserTokens)).Methods("GET")
	router.Handle("/me/token", authenticatedChain.Then(handlers.CreateToken)).Methods("POST")
	router.Handle("/me/token/{token}", authenticatedChain.Then(handlers.RevokeToken)).Methods("DELETE")
	router.Handle("/me/uploads", authenticatedChain.Append(middleware.Paginate).Then(handlers.GetUserUploads)).Methods("GET")
	router.Handle("/me/uploads", authenticatedChain.Then(handlers.RemoveUserUploads)).Methods("DELETE")
	router.Handle("/me/stats", authenticatedChain.Then(handlers.GetUserStatistics)).Methods("GET")

	router.Handle("/user/{userID}", userChain.Then(handlers.UserInfo)).Methods("GET")
	router.Handle("/user/{userID}", userChain.Then(handlers.UpdateUser)).Methods("POST")
	router.Handle("/user/{userID}", userChain.Then(handlers.DeleteAccount)).Methods("DELETE")

	router.Handle("/user", adminChain.Then(handlers.CreateUser)).Methods("POST")
	router.Handle("/stats", adminChain.Then(handlers.GetServerStatistics)).Methods("GET")
	router.Handle("/users", adminChain.Append(middleware.Paginate).Then(handlers.GetUsers)).Methods("GET")
	router.Handle("/uploads", adminChain.Append(middleware.Paginate).Then(handlers.GetUploads)).Methods("GET")

	if !ps.config.NoWebInterface {

		_, err := os.Stat(ps.config.WebappDirectory)
		if err != nil {
			ps.config.NewLogger().Warningf("Webapp directory %s not found, consider setting config.NoWebInterface to true", ps.config.WebappDirectory)
		}

		router.PathPrefix("/clients/").Handler(http.StripPrefix("/clients/", http.FileServer(http.Dir(ps.config.ClientsDirectory))))
		router.PathPrefix("/changelog/").Handler(http.StripPrefix("/changelog/", http.FileServer(http.Dir(ps.config.ChangelogDirectory))))
		router.PathPrefix("/").Handler(http.FileServer(http.Dir(ps.config.WebappDirectory)))
	}

	handler = common.StripPrefix(ps.config.Path, router)
	return handler
}

// WithMetadataBackend configure the metadata backend to use ( call before Start() )
func (ps *PlikServer) WithMetadataBackend(backend *metadata.Backend) *PlikServer {
	if ps.metadataBackend == nil {
		ps.metadataBackend = backend
	}
	return ps
}

// NewMetadataBackend Initialize metadata backend from metadata backend configuration
func NewMetadataBackend(params map[string]interface{}, log *logger.Logger) (backend *metadata.Backend, err error) {
	return metadata.NewBackend(metadata.NewConfig(params), log)
}

// Initialize metadata backend
func (ps *PlikServer) initializeMetadataBackend() (err error) {
	if ps.metadataBackend == nil {
		ps.metadataBackend, err = NewMetadataBackend(ps.config.MetadataBackendConfig, ps.config.NewLogger())
		if err != nil {
			return err
		}
		// Register gorm metrics
		ps.metrics.Register(ps.metadataBackend.GetMetricsCollectors()...)
	}

	return nil
}

// WithDataBackend configure the data backend to use ( call before Start() )
func (ps *PlikServer) WithDataBackend(backend data.Backend) *PlikServer {
	if ps.dataBackend == nil {
		ps.dataBackend = backend
	}
	return ps
}

// NewDataBackend Initialize data backend from type and data backend configuration
func NewDataBackend(impl string, params map[string]interface{}) (backend data.Backend, err error) {
	switch impl {
	case "file":
		backend = file.NewBackend(file.NewConfig(params))
	case "s3":
		backend, err = s3.NewBackend(s3.NewConfig(params))
		if err != nil {
			return nil, err
		}
	case "swift":
		backend = swift.NewBackend(swift.NewConfig(params))
	case "gcs":
		backend, err = gcs.NewBackend(gcs.NewConfig(params))
		if err != nil {
			return nil, err
		}
	case "testing":
		backend = data_test.NewBackend()
	default:
		return nil, fmt.Errorf("Invalid data backend %s", impl)
	}

	return backend, nil
}

// Initialize data backend from type found in configuration
func (ps *PlikServer) initializeDataBackend() (err error) {
	if ps.dataBackend == nil {
		ps.dataBackend, err = NewDataBackend(ps.config.DataBackend, ps.config.DataBackendConfig)
		if err != nil {
			return err
		}
	}

	return nil
}

// WithStreamBackend configure the stream backend to use ( call before Start() )
func (ps *PlikServer) WithStreamBackend(backend data.Backend) *PlikServer {
	if ps.streamBackend == nil {
		ps.streamBackend = backend
	}
	return ps
}

// Initialize data backend from type found in configuration
func (ps *PlikServer) initializeStreamBackend() (err error) {
	if ps.streamBackend == nil && ps.config.FeatureStream != common.FeatureDisabled {
		ps.streamBackend = stream.NewBackend()
	}

	return nil
}

// WithAuthenticator configure the session authenticator to use ( call before Start() )
func (ps *PlikServer) WithAuthenticator(authenticator *common.SessionAuthenticator) *PlikServer {
	if ps.authenticator == nil {
		ps.authenticator = authenticator
	}
	return ps
}

// Initialize the session authenticator
func (ps *PlikServer) initializeAuthenticator() (err error) {
	if ps.authenticator == nil && ps.config.FeatureAuthentication != common.FeatureDisabled {
		if ps.metadataBackend == nil {
			return fmt.Errorf("metadata backend must be initialized before the authenticator")
		}

		for i := 0; i < 2; i++ {
			setting, err := ps.metadataBackend.GetSetting(common.AuthenticationSignatureKeySettingKey)
			if err != nil {
				return fmt.Errorf("unable to get authentication signature key : %s", err)
			}

			if setting == nil {
				setting = common.GenerateAuthenticationSignatureKey()
				err = ps.metadataBackend.CreateSetting(setting)
				if err != nil {
					// There is a slight race condition here if
					// two servers start exactly at the same time for the first time
					// so retry once
					time.Sleep(time.Second)
					continue
				}
			}

			ps.authenticator = &common.SessionAuthenticator{
				SignatureKey:   setting.Value,
				SecureCookies:  ps.config.EnhancedWebSecurity,
				SessionTimeout: ps.config.GetSessionTimeout(),
				Path:           ps.config.GetPath(),
			}

			return nil
		}
	}

	return err
}

// GetConfig return the server configuration
func (ps *PlikServer) GetConfig() *common.Configuration {
	return ps.config
}

// GetMetadataBackend return the configured Backend
func (ps *PlikServer) GetMetadataBackend() *metadata.Backend {
	return ps.metadataBackend
}

// GetDataBackend return the configured DataBackend
func (ps *PlikServer) GetDataBackend() data.Backend {
	return ps.dataBackend
}

// GetStreamBackend return the configured StreamBackend
func (ps *PlikServer) GetStreamBackend() data.Backend {
	return ps.streamBackend
}

// SetupContext sets necessary context values
func (ps *PlikServer) setupContext(ctx *context.Context) {
	ctx.SetConfig(ps.config)
	ctx.SetLogger(ps.config.NewLogger())
	ctx.SetMetadataBackend(ps.metadataBackend)
	ctx.SetDataBackend(ps.dataBackend)
	ctx.SetStreamBackend(ps.streamBackend)
	ctx.SetAuthenticator(ps.authenticator)
	ctx.SetMetrics(ps.metrics)
}
