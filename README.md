![Managed Security Platform Infrastructure by Quantum](.docs/readme-header.svg)

# ci-analysis-collector

[![Build Status][build_badge_image]][build_badge_link]
[![License][license_badge_image]][license_badge_link]
[![@quantum-sec/ci-analysis-core][npm_badge_image]][npm_badge_link]
[![Maintained by quantum.security][maintained_badge_image]][maintained_badge_link]

Quantum's CI analysis collector utility is a wrapper for common security tools for normalizing results to rank and
prioritize the remediation of vulnerabilities discovered in your applications and infrastructure.

This utility can be modified to be used with your own aggregation and analysis pipeline or used directly with the
[Quantum Security Platform](https://www.quantum.security/platform?utm_source=github&utm_medium=organic&utm_campaign=ci-analysis-collector).


## Prerequisites

This utility requires [Node.js](https://nodejs.org/en/download/) and [git](https://git-scm.com/downloads). Additionally,
you must install any tools you wish to use that are wrapped by this utility – each of which will have its own
dependencies. Alternatively, Quantum supplies Docker containers for each of the officially supported tools.

## Usage

Use `npx` to directly reference, install, and run this utility:

```bash
# npx <= 6
npx @quantum-sec/ci-analysis-collector [tool] [args]

# npx >= 7
npx --yes --package @quantum-sec/ci-analysis-collector \
  --call 'ci-analysis-collector [tool] [args]'
```

Where `[tool]` is the all lowercase name or "ID" of the tool (see the table of supported tools below) and where `[args]`
are any of the following **optional** arguments:

### Arguments

- `--path [path]` – the path to source code being analyzed (default: `"$PWD"`)
- `--soft-fail` – when specified a zero exit code will be returned regardless of whether or not checks are failing (default: `false`)
- `--quiet` – when specified, passing checks will be excluded from the printed output (default: `false`)
- `--log-level [LEVEL]` – the log verbosity (one of `error`, `warning`, `info`, or `debug`) (default: `info`)
- `--webhook-url [URL]` – the URL to which results will be `PUT` (defaults to the Quantum Platform webhook)

### Environment Variables

- `QS_API_TOKEN` – the API token associated with this analysis collection generated in the [Quantum Security Console](https://console.prod.platform.quantum.security/)
- `QS_COLLECTOR_SOFT_FAIL` – same as the `--soft-fail` argument above
- `QS_COLLECTOR_QUIET` – same as the `--quiet` argument above
- `QS_COLLECTOR_WEBHOOK_URL` – same as the `--webhook-url` argument above


## Supported Tools

| Tool                                                                   | Analysis Type | Platforms / Languages                                                                                                                                           | Container Runtime                                                                                                     |
|------------------------------------------------------------------------|---------------|-----------------------------------------------------------------------------------------------------------------------------------------------------------------|-----------------------------------------------------------------------------------------------------------------------|
| [checkov](https://github.com/bridgecrewio/checkov)                     | SAST          | Terraform<br />CloudFormation<br />ARM Templates<br />Dockerfile<br />Kubernetes                                                                                | [quantumsec/docker-pipeline-checkov](https://hub.docker.com/repository/docker/quantumsec/docker-pipeline-checkov)     |
| [sonarqube](https://github.com/SonarSource/sonarqube)<br />_(Planned)_ | SAST, DAST    | C / C++ / Objective-C<br />C#<br />Go<br />Java<br />JavaScript / TypeScript<br />Kotlin<br />PHP<br />Python<br />Ruby<br />Scala<br />Swift<br />Visual Basic | [quantumsec/docker-pipeline-sonarqube](https://hub.docker.com/repository/docker/quantumsec/docker-pipeline-sonarqube) |
| [tfsec](https://github.com/aquasecurity/tfsec)<br />_(Planned)_        | SAST          | Terraform                                                                                                                                                       | [quantumsec/docker-pipeline-tfsec](https://hub.docker.com/repository/docker/quantumsec/docker-pipeline-tfsec)         |


## Code of Conduct

Help us keep this project open and inclusive. Please read and follow our [Code of Conduct](https://www.quantum.security/oss/code-of-conduct).

## License

This code is released under the Apache 2.0 License.


[build_badge_image]:https://dev.azure.com/quantum-sec/Quantum/_apis/build/status/Tools/quantum-sec.ci-analysis-collector?repoName=quantum-sec%2Fci-analysis-collector&branchName=master
[build_badge_link]:https://dev.azure.com/quantum-sec/Quantum/_build/latest?definitionId=84&repoName=quantum-sec%2Fci-analysis-collector&branchName=master
[license_badge_image]:https://img.shields.io/npm/l/@quantum-sec/ci-analysis-collector.svg?color=008cda
[license_badge_link]:./LICENSE
[npm_badge_image]:https://img.shields.io/npm/v/@quantum-sec/ci-analysis-collector.svg?color=5915ac
[npm_badge_link]:https://www.npmjs.com/package/@quantum-sec/ci-analysis-collector
[maintained_badge_image]:https://img.shields.io/badge/maintained%20by-quantum.security-00da55
[maintained_badge_link]:https://www.quantum.security?utm_source=github&utm_medium=organic_oss&utm_campaign=ci-analysis-collector
