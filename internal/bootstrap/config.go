package bootstrap

const (
	DefaultVersion = "dev"
	DefaultCommit  = "unknown"
	DefaultDate    = "unknown"

	DefaultAppName       = "goLocalThreat"
	DefaultAppIdentifier = "io.golocalthreat.app"
	DefaultFrontendDir   = "frontend"
)

type BuildMetadata struct {
	Version string
	Commit  string
	Date    string
}

type StartupWiring struct {
	AppName       string
	AppIdentifier string
	FrontendDir   string
}

func ResolveBuildMetadata(version, commit, date string) BuildMetadata {
	if version == "" {
		version = DefaultVersion
	}
	if commit == "" {
		commit = DefaultCommit
	}
	if date == "" {
		date = DefaultDate
	}
	return BuildMetadata{Version: version, Commit: commit, Date: date}
}

func DefaultStartupWiring() StartupWiring {
	return StartupWiring{
		AppName:       DefaultAppName,
		AppIdentifier: DefaultAppIdentifier,
		FrontendDir:   DefaultFrontendDir,
	}
}
