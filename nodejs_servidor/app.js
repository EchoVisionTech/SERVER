const express = require('express')
const multer = require('multer');
const url = require('url')
const fs = require('fs');

const app = express()
const port = process.env.PORT || 3000

const storage = multer.memoryStorage();
const upload = multer({ storage: storage });

app.use(express.static('public'))
app.use(express.json());

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
  const textPost = req.body;
  const uploadedFile = req.file;
  let objPost = {}
  console.log(textPost.data);
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
      if (objPost.prompt == '') {
        const messageText = "what's in this image?";
      } else {
        const messageText = objPost.text;
      }

      const imageList = [];

      for (image in objPost.image) {
        const img = fs.readFileSync(objPost.image);

        const imgB64 = Buffer.from(img).toString('base64');

        imageList.push(imgB64);
      }

      let url = 'http://localhost:11434/api/maria/image';
      var data = {
        prompt: messageText,
        images: imageList
      };
      
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

