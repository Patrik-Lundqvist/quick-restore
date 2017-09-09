const path = require('path');
const os = require('os');
const md5File = require('md5-file/promise');
const fs = require('fs-extra');

const S3Source = require('../index');
const MockS3Client = require('./__mocks__/s3Client');
const config = require('./__fixtures__/s3.json');
const configWithPrefix = require('./__fixtures__/s3WithPrefix.json');
const packageSettings = require('../../../../package.json');
const noop = require('../../../utils/noop');

const tmpDir = path.join(os.tmpdir(), `./${packageSettings.name}-test`);
const cacheFixture = path.join(__dirname, './__fixtures__/cache');
const testBucketPath = path.join(__dirname, './__fixtures__/test-bucket');

const isSameFile = (file1, file2) =>
  Promise.all([md5File(file1), md5File(file2)]).then(
    hashes => hashes[0] === hashes[1]
  );

describe('s3 test', function () {
  beforeEach(() => fs.remove(`${tmpDir}/`));

  it('downloads latest file', async () => {
    const latestFilePath = path.join(testBucketPath, '/latest.txt');
    const s3Source = new S3Source(config, tmpDir, noop, MockS3Client);
    const file = await s3Source.downloadLatestFile();
    const isSame = await isSameFile(file, latestFilePath);
    expect(isSame).toBe(true);
  });

  it('downloads latest file with prefix', async () => {
    const latestBarFilePath = path.join(testBucketPath, '/bar/bar-latest.txt');
    const s3Source = new S3Source(configWithPrefix, tmpDir, noop, MockS3Client);
    const file = await s3Source.downloadLatestFile();
    const isSame = await isSameFile(file, latestBarFilePath);
    expect(isSame).toBe(true);
  });

  it('uses cached file', async () => {
    await fs.copy(cacheFixture, path.join(tmpDir, '/cache/s3'));
    const s3Source = new S3Source(config, tmpDir, noop, MockS3Client);
    const dest = await s3Source.downloadLatestFile();
    const fileExists = await fs.pathExists(dest);
    expect(fileExists).toBe(true);
  });

  it('cleans old cache', async () => {
    await fs.copy(cacheFixture, path.join(tmpDir, '/cache/s3'));
    const s3Source = new S3Source(configWithPrefix, tmpDir, noop, MockS3Client);
    await s3Source.downloadLatestFile();
    const fileExists = await fs.pathExists(
      path.join(tmpDir, '/cache/s3/cached.txt')
    );
    expect(fileExists).toBe(false);
  });
});
