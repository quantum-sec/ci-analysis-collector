import { CheckResult } from './check-result';

export interface IResult {

  /**
   * The tool's native identifier for the unique check or rule.
   */
  checkId: string;

  /**
   * The type of check that was performed (i.e. `terraform`, `helm`, etc.)
   */
  checkType: string;

  /**
   * The name of the check. This is only used to preserve usability in the console and will
   * not be included in the webhook payload posted to Quantum.
   */
  checkName: string;

  /**
   * Whether the check passed, failed, was skipped, or did not run as the result of an error.
   */
  checkResult: CheckResult;

  /**
   * For IaC resources, this is the identifier within the template.
   * For example in Terraform, aws_security_group.this
   * For unmanaged resources, this is the identifier from the provider.
   * For example in AWS this is the ARN of the resource.
   * When none of these are applicable use the file path as the resourceId.
   */
  resourceId: string;

  // FILE-BASED SCANNER RESULT FIELDS
  // The following optional fields only apply to file-based tools.

  /**
   * The fully-qualified repository URI (i.e. git@github.com:quantum-sec/ci-analysis-collector)
   */
  repo?: string;

  /**
   * The current commit hash of the repository at the target HEAD.
   */
  commitHash?: string;

  /**
   * The path of the file relative to the repository root.
   */
  filePath?: string;

  /**
   * A tuple containing the start and end line numbers of the relevant code.
   */
  fileLineRange?: [number, number];

  /**
   * An array of tuples containing the line number and the contents of each line of relevant code.
   */
  codeBlock?: [number, string][];

  // API-BASED SCANNER RESULT FIELDS
  // The following optional fields only apply to API-based tools.

  /**
   * The raw response from the queried API.
   */
  responseBody?: string;

  // VULNERABILITY BASED RESULT FIELDS
  // The following optional fields only apply to tools that return vulnerabilities.

  /**
   * The raw response from the queried API.
   */
  vulnerabilityId?: string;

  /**
   * The name of the package in which the vulnerability was found.
   */
  packageName?: string;

  /**
   * The version of the package in which the vulnerability was found.
   */
  packageVersion?: string;

  /**
   * The check method of the tool, e.g. get, post, etc.
   */
  checkMethod?: string;

}
