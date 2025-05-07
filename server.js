const http = require('http')
const fs = require('fs')
const path = require('path')
const crypto = require('node:crypto')

let port = process.argv[2] || 4000
const httpServer = http.createServer(requestHandler)
httpServer.listen(port, () => {
  console.log('server is listening on port ' + port)
})

process.on('uncaughtException', function (err) {
  console.log('Caught exception: ' + err)
})

const uuid = () =>
  ([1e7] + -1e3 + -4e3 + -8e3 + -1e11).replace(/[018]/g, (c) =>
    (c ^ (crypto.getRandomValues(new Uint8Array(1))[0] & (15 >> (c / 4)))).toString(16)
  )
function requestHandler(req, res) {
  // Set CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Request-Method', '*')
  res.setHeader('Access-Control-Allow-Methods', 'OPTIONS,GET,POST,PUT,DELETE')
  res.setHeader('Access-Control-Allow-Headers', '*')
  res.setHeader('Access-Control-Expose-Headers', '*')

  req.on('error', function (err) {
    console.error(`request error ... ${err}`)
  })
  try {
    res.statusCode = 200
    if (req.url === '/') {
      sendIndexHtml(req, res)
    } else if (req.url === '/list') {
      sendListOfUploadedFiles(req, res)
    } else if (/\/download\/.+$/.test(req.url)) {
      sendUploadedFile(req, res)
    } else if (/\/upload\/.+$/.test(req.url)) {
      saveUploadedFile(req, res)
    } else if (/\/concat\/.+$/.test(req.url)) {
      concatUploadedFile(req, res)
    } else if (/\/tagurl\/.+$/.test(req.url)) {
      tagUploadedFile(req, res)
    } else if (/\/delete\/.+$/.test(req.url)) {
      deleteFile(req, res)
    } else {
      sendInvalidRequest(req, res)
    }
  } catch (err) {
    console.error(`catch error ... ${err}`)
  }
}

function sendIndexHtml(req, res) {
  let indexFile = path.join(__dirname, 'index.html')
  fs.readFile(indexFile, (err, content) => {
    if (err) {
      res.setHeader('Content-Type', 'text')
      res.statusCode = 404
      res.write('File Not Found!')
      console.error(`File not found ${indexFile}`)
    } else {
      res.setHeader('Content-Type', 'text/html')
      res.write(content)
      console.log('send index.html')
    }
    res.end()
  })
}

function sendListOfUploadedFiles(req, res) {
  let uploadDir = path.join(__dirname, 'download')
  fs.readdir(uploadDir, (err, files) => {
    res.setHeader('Content-Type', 'application/json')
    if (err) {
      console.log(err)
      res.statusCode = 400
      res.write(JSON.stringify(err.message))
      console.error(`Error send list ${err.message}`)
    } else {
      res.write(JSON.stringify(files))
      console.log(`Send list files`)
    }
    res.end()
  })
}

function sendUploadedFile(req, res) {
  let file = path.join(__dirname, req.url)
  fs.readFile(file, (err, content) => {
    if (err) {
      res.setHeader('Content-Type', 'text')
      res.statusCode = 404
      res.write('File Not Found!')
      console.error(`Error send file ${file}`)
    } else {
      res.setHeader('Content-Type', 'application/octet-stream')
      res.write(content)
      console.log(`Send file ${file}`)
    }
    res.end()
  })
}

function concatUploadedFile(req, res) {
  const fileName = path.basename(req.url)
  const extName = path.extname(req.url)
  const fileNameNoExt = path.basename(req.url, extName)
  const dirName = path.dirname(req.url).slice(7) // /concat
  const outputFilePath = path.join(__dirname, 'download', dirName, fileName)
  console.log(`-- Start concat file ${outputFilePath}`)
  const bufferArr = []
  const filePathsArray = []
  let idx = 0
  while (true) {
    const fileIdx = path.join(__dirname, 'download', dirName, `${fileNameNoExt}_${idx}${extName}`)
    if (!fs.existsSync(fileIdx)) {
      break
    }
    filePathsArray.push(fileIdx)
    bufferArr.push(fs.readFileSync(fileIdx))
    idx++
  }
  if (bufferArr.length === 0) return sendInvalidRequest(req, res)
  fs.writeFileSync(outputFilePath, Buffer.concat(bufferArr))
  filePathsArray.forEach((filePath) => fs.unlinkSync(filePath))
  res.setHeader('Content-Type', 'application/json')
  res.write(JSON.stringify({ fileName, concat: filePathsArray.length }))
  console.log(`    ... End concat file ... ${outputFilePath}`)
}

function saveUploadedFile(req, res) {
  const fileName = path.basename(req.url)
  const dirName = path.dirname(req.url).slice(7) // /upload
  const dir = path.join(__dirname, 'download', dirName)
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true })
  const file = path.join(dir, fileName)
  console.log(`-- Start upload file ${fileName}`)
  req.pipe(fs.createWriteStream(file))
  req.on('end', () => {
    res.setHeader('ETag', uuid())
    res.setHeader('Content-Type', 'text')
    res.write('uploaded succesfully')
    res.end()
    console.log(`    ... Saved ... ${fileName}`)
  })
}

function tagUploadedFile(req, res) {
  const fileName = path.basename(req.url)
  const dirName = path.dirname(req.url).slice(7) // /tagurl
  const file = path.join(__dirname, 'download', dirName, fileName)
  if (!fs.existsSync(file)) return sendInvalidRequest(req, res)
  const stats = fs.statSync(file)
  res.setHeader('Content-Type', 'application/json')
  res.write(JSON.stringify({ url: `http://localhost:${port}/${path.join('download', dirName)}/${fileName}`, size: stats.size }))
  res.end()
  console.log(`-- Send upload file url ${dirName}/${fileName}`)
}

function deleteFile(req, res) {
  const fileName = path.basename(req.url)
  const dirName = path.dirname(req.url).slice(7) // /delete
  const file = path.join(__dirname, 'download', dirName, fileName)
  if (!fs.existsSync(file)) return sendInvalidRequest(req, res)
  const stats = fs.statSync(file)
  fs.unlinkSync(file)
  res.setHeader('Content-Type', 'application/json')
  res.write(JSON.stringify({ delete: `${dirName}/${fileName}`, size: stats.size }))
  res.end()
  console.log(`-- Delete file ${dirName}/${fileName}`)
}

function sendInvalidRequest(req, res) {
  res.setHeader('Content-Type', 'application/json')
  res.statusCode = 400
  res.write('Invalid Request')
  res.end()
  console.error(`  !!!!   Invalid request    !!!!  ${req.url}`)
}
