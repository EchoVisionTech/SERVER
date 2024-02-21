const express = require('express')
const multer = require('multer');
const url = require('url')
const fs = require('fs');
const bodyParser = require('body-parser');

const app = express()
const port = process.env.PORT || 80

const storage = multer.memoryStorage();
const upload = multer({
  storage: storage,
  limits: { fileSize: 1000 * 1024 * 1024 }
});

app.use(express.static('public'))
app.use(express.json());
app.use(bodyParser.json({ limit: '10mb' }));
app.use(bodyParser.urlencoded({ extended: true, limit: '10mb' }));


const httpServer = app.listen(port, async () => {
  console.log(`Listening for HTTP queries on: http://localhost:${port}`)
})

process.on('SIGTERM', shutDown);
process.on('SIGINT', shutDown);

function shutDown() {
  console.log('Received kill signal, shutting down gracefully');
  httpServer.close()
  process.exit(0);
}

app.post('/data', upload.single('file'), async (req, res) => {
  console.log('MESSAGE')
  const textPost = req.body;
  const uploadedFile = req.file;
  let objPost = {}
  //console.log(textPost.data);
  try {
    objPost = JSON.parse(textPost.data)
  } catch (error) {
    res.status(400).send('Sol·licitud incorrecta.')
    console.log(error)
    return
  }

  if (objPost.type === 'image') {
    console.log('message received "imatge"')
    try {
      // const messageText = "what's in this image?";
      const messageText = "Describe esta imagen";
      
      const imageList = [];      
      imageList.push(objPost.image);
      
      let url = 'http://192.168.1.14:11434/api/generate';
      var data = {
        model: "llava",
        prompt: messageText,
        images: imageList
      };

      sendPeticioToDBAPI(messageText, objPost.image);
      
      fetch(url, {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify(data)
      }).then(function (respuesta) {
        if (!respuesta.ok) {
          res.status(400).send('Error en la solicitud.')
          throw new Error("Error en la solicitud");
        }
        return respuesta.text();
      })
      .then(function (datosRespuesta) {
        var lineas = datosRespuesta.split('\n');
        
        var objetosJSON = [];
        for (var i = 0; i < lineas.length; i++) {
          var linea = lineas[i].trim(); 
          if (linea) {
            objetosJSON.push(JSON.parse(linea));
          }
        }
        
        res.writeHead(200, { 'Content-Type': 'text/plain; charset=UTF-8' })
        var resp = "";
        objetosJSON.forEach(function(objeto) {
          resp = resp + objeto.response;
          res.write(objeto.response);
        });
        
        console.log('image response');
        res.end("")
      })
      .catch(function (error) {
        res.status(200).send('Error en la solicitud a marIA')
        console.error("Error en la solicitud:", error);
      });
      
    } catch (error) {
      console.log(error);
      res.status(500).send('Error processing request.');
    }
  } else {
    console.log('error, type not exists')
    res.status(400).send('Sol·licitud incorrecta.')
  }
})

function sendPeticioToDBAPI(messageText, image) {
  let url = "http://localhost:8080/api/peticions/afegir"
  var data = {
    model: "llava",
    prompt: messageText,
    images: image
  };

  fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify(data)
  })
  .then(function (response) {
    if (!response.ok) {
        throw new Error('Network response was not ok');
    }
    return response.text();
  })
  .then(function (textResponse) {
    console.log('Text Response:', textResponse);
  })
  .catch(function (error) {
    console.error('Fetch Error:', error);
  });

}