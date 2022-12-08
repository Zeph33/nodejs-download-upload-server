const http = require('http')
const fs = require('fs')
const path = require('path')

let port = process.argv[2] || 3000
const httpServer = http.createServer(requestHandler)
httpServer.listen(port, () => {
  console.log('server is listening on port ' + port)
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
  if (req.url === '/') {
    sendIndexHtml(res)
  } else if (req.url === '/list') {
    sendListOfUploadedFiles(res)
  } else if (/\/download\/[^\/]+$/.test(req.url)) {
    sendUploadedFile(req.url, res)
  } else if (/\/upload\/[^\/]+$/.test(req.url)) {
    saveUploadedFile(req, res)
  } else {
    sendInvalidRequest(res)
  }
}

function sendIndexHtml(res) {
  let indexFile = path.join(__dirname, 'index.html')
  fs.readFile(indexFile, (err, content) => {
    if (err) {
      res.writeHead(404, { 'Content-Type': 'text' })
      res.write('File Not Found!')
      res.end()
    } else {
      res.writeHead(200, { 'Content-Type': 'text/html' })
      res.write(content)
      res.end()
    }
  })
}

function sendListOfUploadedFiles(res) {
  let uploadDir = path.join(__dirname, 'download')
  fs.readdir(uploadDir, (err, files) => {
    if (err) {
      console.log(err)
      res.writeHead(400, { 'Content-Type': 'application/json' })
      res.write(JSON.stringify(err.message))
      res.end()
    } else {
      res.writeHead(200, { 'Content-Type': 'application/json' })
      res.write(JSON.stringify(files))
      res.end()
    }
  })
}

function sendUploadedFile(url, res) {
  let file = path.join(__dirname, url)
  fs.readFile(file, (err, content) => {
    if (err) {
      res.writeHead(404, { 'Content-Type': 'text' })
      res.write('File Not Found!')
      res.end()
    } else {
      res.writeHead(200, { 'Content-Type': 'application/octet-stream' })
      res.write(content)
      res.end()
    }
  })
}

function saveUploadedFile(req, res) {
  console.log('saving uploaded file')
  res.setHeader('ETag', uuid())
  let fileName = path.basename(req.url)
  let file = path.join(__dirname, 'download', fileName)
  req.pipe(fs.createWriteStream(file))
  req.on('end', () => {
    res.writeHead(200, { 'Content-Type': 'text' })
    res.write('uploaded succesfully')
    res.end()
  })
}

function sendInvalidRequest(res) {
  res.writeHead(400, { 'Content-Type': 'application/json' })
  res.write('Invalid Request')
  res.end()
}
