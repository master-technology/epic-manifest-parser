# Node Epic Manifest Parser

A Node.js library to read and parse EpicGame's / Unreal Engine's manifest

## Example Usage

```js
const { Manifest, ManifestInfo, ManifestOptions } = require('epic-manifest-parser');
const crypto = require('crypto');
const axios = require('axios');
const path = require('path');
const fs = require('fs');

(async () => {
  let res = await axios({ url: 'https://my.sslbypass.works/ff22f5b6.json' })
  if (res.status !== 200) throw new Error(`Failed to grab manifest, status code: ${res.status}, ${res.data.toString()}`)

  let options = new ManifestOptions({ cacheDirectory: path.join(process.env.USERPROFILE, 'Documents', 'FortniteChunks') })
  let manifestInfo = new ManifestInfo(res.data)
  console.log(`Grabbing manifest for ${manifestInfo.AppName} (${manifestInfo.BuildVersion})`);

  let manifestData = await manifestInfo.downloadManifestData(options.cacheDirectory)
  let manifest = new Manifest(manifestData, options)
  console.log(`Grabbed manifest for ${manifest.BuildVersion} (${manifest.BuildId})\n`);

  options.chunkBaseUri = 'http://epicgames-download1.akamaized.net/Builds/Fortnite/CloudDir/' + manifest.getChunkSubdir() + '/'

  let files = manifest.FileManifestList.filter(f => f.Tags.includes('chunk0'))
  let start = Date.now()

  await Promise.all(files.map(async file => new Promise(resolve => {
    let path = `./out/${file.Name.split('/').pop()}`
    if (fs.existsSync(path)) {
      let buf = fs.readFileSync(path)
      let hash = crypto.createHash('sha1').update(buf).digest('hex')

      if (hash === file.Hash.toString('hex')) {
        console.log(`Skipping ${file.Name.split('/').pop()} because its already downloaded`);
        return resolve()
      }
      else console.log(`Hash missmatch for ${file.Name.split('/').pop()}`);
      fs.renameSync(path, path + '.temp')
    }

    let s = Date.now()

    console.log(`Downloading ${file.Name.split('/').pop()} (${file.Size})`);

    let stream = file.getStream()
    let fstream = fs.createWriteStream(path + '.temp')
    stream.pipe(fstream)

    fstream.on('finish', _ => {
      fstream.close()
      fs.renameSync(path + '.temp', path)
      console.log(`Finished downloaded ${file.Name.split('/').pop()} in ${(Date.now() - s) / 1000} ms`);
      resolve()
    })
  })))

  console.log(`\nDownloaded ${files.length} files in ${(Date.now() - start) / 1000} ms`);
})();
```

## Documentation

Maybe soon

## Inspiration

This library is inspired by
[EpicManifestParser](https://github.com/NotOfficer/EpicManifestParser/) made by [Officer](https://github.com/NotOfficer/)
and [EpicManifestDownloader](https://github.com/VastBlast/EpicManifestDownloader/) made by [VastBlast](https://github.com/VastBlast/)
