const core = require("@actions/core");
const exec = require("@actions/exec");
const github = require("@actions/github");
const fs = require("fs");
const io = require("@actions/io");
const path = require("path");
const util = require("util");
const Mustache = require("mustache");

const writeFile = util.promisify(fs.writeFile);
const readFile = util.promisify(fs.readFile);

/**
 * Status marks the deployment status. Only activates if token is set as an
 * input to the job.
 *
 * @param {string} state
 */
async function status(state) {
  try {
    const context = github.context;
    const deployment = context.payload.deployment;
    const token = core.getInput("token");
    if (!token || !deployment) {
      core.debug("not setting deployment status");
      return;
    }

    const client = new github.GitHub(token);
    const url = `https://github.com/${context.repo.owner}/${context.repo.repo}/commit/${context.sha}/checks`;

    await client.repos.createDeploymentStatus({
      ...context.repo,
      deployment_id: deployment.id,
      state,
      log_url: url,
      target_url: url,
      headers: {
        accept: "application/vnd.github.ant-man-preview+json"
      }
    });
  } catch (error) {
    core.warning(`Failed to set deployment status: ${error.message}`);
  }
}

/**
 * Get list parses an input with optional JSON syntax.
 *
 * @param {*} input
 * @returns {Array<string>}
 */
function getList(files) {
  let fileList;
  if (typeof files === "string") {
    try {
      fileList = JSON.parse(files);
    } catch (err) {
      // Assume it's a single string.
      fileList = [files];
    }
  } else {
    fileList = files;
  }
  if (!Array.isArray(fileList)) {
    return [];
  }
  return fileList.filter(f => !!f);
}

/**
 * Render files renders data into the list of provided files.
 * @param {Array<string>} files
 * @param {any} data
 */
function renderFiles(files, data) {
  core.debug(
    `rendering files ${JSON.stringify(files)} with: ${JSON.stringify(data)}`
  );
  const tags = ["${{", "}}"];
  const promises = files.map(async file => {
    const content = await readFile(file, { encoding: "utf8" });
    const rendered = Mustache.render(content, data, {}, tags);
    await writeFile(file, rendered);
  });
  return Promise.all(promises);
}

/**
 * Copies files over to dest
 * @param {Array<string>} files
 * @param {string} dst
 */
function copyFiles(files, dst) {
  core.debug(`copying files ${JSON.stringify(files)} to ${dst}`);
  const promises = files.map(src => io.cp(src, dst));
  return Promise.all(promises);
}

async function run() {
  try {
    const context = github.context;
    const remote = core.getInput("remote", { required: true });
    const branch = core.getInput("branch", { required: true });
    const target = core.getInput("target", { required: true });
    const dryRun = core.getInput("dry-run") || false;
    const manifests = getList(core.getInput("manifests", { required: true }));

    core.debug(`param: remote = "${remote}"`);
    core.debug(`param: branch = "${branch}"`);
    core.debug(`param: manifests = ${JSON.stringify(manifests)}`);

    await status("pending");

    await exec.exec("git", ["config", "user.email", "support@deliverybot.dev"]);
    await exec.exec("git", ["config", "user.name", "bot[gitops]"]);

    await exec.exec("git", [
      "clone",
      "--depth",
      "1",
      "--single-branch",
      "--branch",
      branch,
      remote,
      "target" // TODO: Make this a temp file.
    ]);

    await renderFiles(manifests, context.payload);
    await copyFiles(manifests, path.join("target", target));

    await exec.exec("git", ["add", "."], { cwd: "./target" });
    await exec.exec("git", ["commit", "-m", `Deploy`], { cwd: "./target" });
    if (!dryRun) {
      await exec.exec("git", ["push"], { cwd: "./target" });
    }

    await status("success");
  } catch (error) {
    core.error(error);
    core.setFailed(error.message);
    await status("failure");
  }
}

run();
