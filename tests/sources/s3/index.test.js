const path = require("path");
const os = require("os");
const md5File = require("md5-file");
const fs = require("fs-extra");

const S3Source = require("../../../src/sources/s3");
const S3Client = require("../../../src/sources/s3/s3Client");
const config = require("./__fixtures__/s3.json");
const configWithPrefix = require("./__fixtures__/s3WithPrefix.json");
const packageSettings = require("../../../package.json");
const noop = require("../../../src/utils/noop");

const tmpDir = path.join(os.tmpdir(), `./${packageSettings.name}-test`);
const cacheFixture = path.join(__dirname, "./__fixtures__/cache");
const testBucketPath = path.join(__dirname, "./__fixtures__/test-bucket");
const latestFilePath = "latest.txt";
const latestFooFilePath = "foo/foo-latest.txt";
const latestBarFilePath = "bar/bar-latest.txt";

const isSameFile = (file1, file2) =>
  Promise.all([md5File(file1), md5File(file2)]).then(
    (hashes) => hashes[0] === hashes[1],
  );

describe("s3 test", function () {
  beforeEach(() => {
    fs.removeSync(`${tmpDir}/`);
  });

  beforeAll(async () => {
    const s3Client = new S3Client(config);
    await s3Client.upload(
      latestFilePath,
      path.join(testBucketPath, latestFilePath),
    );
    await s3Client.upload(
      latestFooFilePath,
      path.join(testBucketPath, latestFooFilePath),
    );
    await s3Client.upload(
      latestBarFilePath,
      path.join(testBucketPath, latestBarFilePath),
    );
  });

  it("downloads latest file", async () => {
    const s3Source = new S3Source(config, tmpDir, noop);
    const file = await s3Source.downloadLatestFile();
    const isSame = await isSameFile(
      file,
      path.join(testBucketPath, latestFilePath),
    );
    expect(isSame).toBe(true);
  });

  it("downloads latest file with prefix", async () => {
    const s3Source = new S3Source(configWithPrefix, tmpDir, noop);
    const file = await s3Source.downloadLatestFile();
    const isSame = await isSameFile(
      file,
      path.join(testBucketPath, latestBarFilePath),
    );
    expect(isSame).toBe(true);
  });

  it("uses cached file", async () => {
    await fs.copy(cacheFixture, path.join(tmpDir, "/cache/s3"));
    const s3Source = new S3Source(config, tmpDir, noop);
    const dest = await s3Source.downloadLatestFile();
    const fileExists = await fs.pathExists(dest);
    expect(fileExists).toBe(true);
  });

  it("cleans old cache", async () => {
    await fs.copy(cacheFixture, path.join(tmpDir, "/cache/s3"));
    const s3Source = new S3Source(configWithPrefix, tmpDir, noop);
    await s3Source.downloadLatestFile();
    const fileExists = await fs.pathExists(
      path.join(tmpDir, "/cache/s3/cached.txt"),
    );
    expect(fileExists).toBe(false);
  });
});
