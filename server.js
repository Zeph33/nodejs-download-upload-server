const http = require('http')
const fs = require('fs')
const path = require('path')
const crypto = require('node:crypto')

let port = process.argv[2] || 3000
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
  req.on('error', function (err) {
    console.error(`request error ... ${err}`)
  })
  try {
    res.statusCode = 200
    if (req.url === '/') {
      sendIndexHtml(req, res)
    } else if (req.url === '/list') {
      sendListOfUploadedFiles(req, res)
    } else if (/\/download\/[^\/]+$/.test(req.url)) {
      sendUploadedFile(req, res)
    } else if (/\/upload\/[^\/]+$/.test(req.url)) {
      saveUploadedFile(req, res)
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

function saveUploadedFile(req, res) {
  let fileName = path.basename(req.url)
  let file = path.join(__dirname, 'download', fileName)
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

function sendInvalidRequest(req, res) {
  res.setHeader('Content-Type', 'application/json')
  res.statusCode = 400
  res.write('Invalid Request')
  res.end()
  console.error(`  !!!!   Invalid request    !!!!  ${req.url}`)
}
