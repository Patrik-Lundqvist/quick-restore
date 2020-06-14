const execa = require("execa");
const path = require("path");
const { runCLI } = require("jest");

const rootPath = process.cwd();
const testsPath = path.resolve(rootPath, "tests");
const dockerComposePath = path.resolve(rootPath, "tests/docker-compose.yml");

stopDockerContainers();
startDockerContainers();
runJest();

function stopDockerContainers() {
  const command = `docker-compose \
                  -f ${`${dockerComposePath}`} \
                  down \
                  --remove-orphans`;

  execa.commandSync(command);
}

function startDockerContainers() {
  const command = `docker-compose \
                  -f ${`${dockerComposePath}`} \
                  up \
                  --force-recreate \
                  --detach `;

  execa.commandSync(command);
  console.log("Docker containers started.");
}

function runJest() {
  runCLI(
    {
      roots: [testsPath],
      testTimeout: 30000,
      testRunner: "jest-circus/runner",
      runInBand: true,
      bail: true,
    },
    [testsPath],
  )
    .then(({ results }) => {
      if (!results.success) {
        process.exit(1);
      }
    })
    .catch((error) => {
      console.log(error);
      process.exit(1);
    });
}
