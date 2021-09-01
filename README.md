# Node Epic Manifest Marser

A Node.js library to read and parse EpicGame's / Unreal Engine's manifest

## Example Usage

```js
const { request, Manifest, ManifestInfo, ManifestOptions } = require('epic-manifest-parser');
const path = require('path');
const fs = require('fs');

(async () => {
  let data = await request({ uri: 'https://my.sslbypass.works/ff22f5b6.json' })
  if (data.status !== 200) throw new Error(`Failed to grab manifest, status code: ${data.status}, ${data.content.toString()}`)

  let options = new ManifestOptions({ cacheDirectory: path.join(process.env.USERPROFILE, 'Documents', 'FortniteChunks') })
  let manifestInfo = new ManifestInfo(data.content, options)
  console.log(`Grabbing manifest for ${manifestInfo.appName} (${manifestInfo.buildVersion})`);

  let manifestData = await manifestInfo.downloadManifestData()
  let manifest = new Manifest(manifestData, options)
  console.log(`Grabbed manifest for ${manifest.BuildVersion} (${manifest.BuildId})`);

  options.chunkBaseUri = 'http://epicgames-download1.akamaized.net/Builds/Fortnite/CloudDir/' + manifest.getChunkSubdir() + '/'

  let files = manifest.FileManifestList.filter(f => 'InstallTags' in f && f.InstallTags.includes('chunk0'))
  for (var file of files) {
    console.log(`Downloading ${file.Name}`);

    let stream = file.getStream()
    let fstream = fs.createWriteStream(`./out/${file.Name.split('/').pop()}`)

    stream.pipe(fstream)

    console.log(file.Name);
  }
})();
```

## Documentation

Maybe soon

## Inspiration

This library is inspired by
[EpicManifestParser](https://github.com/NotOfficer/EpicManifestParser/) made by [Officer](https://github.com/NotOfficer/)
and [EpicManifestDownloader](https://github.com/VastBlast/EpicManifestDownloader/) made by [VastBlast](https://github.com/VastBlast/)