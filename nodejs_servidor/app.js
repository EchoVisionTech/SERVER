const express = require('express')
const multer = require('multer');
const bodyParser = require('body-parser');

const app = express()
const port = process.env.PORT || 80

const storage = multer.memoryStorage();
const upload = multer({
  storage: storage,
  limits: { fileSize: 1000 * 1024 * 1024 }
});

app.use(express.static('public'))
app.use(bodyParser.urlencoded({ extended: true, limit: '10mb' }));
app.use(express.json());
app.use(bodyParser.json({ limit: '10mb' }));


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


////////////////
///  IMAGEN  ///
////////////////

app.post('/api/maria/image', upload.single('file'), async (req, res) => {
  console.log('image MESSAGE')
  const textPost = req.body;
  const uploadedFile = req.file;
  let objPost = {}
  
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

      sendPeticioToDBAPI(messageText, imageList);
      
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
        var resp = "";
        lineas.forEach(function(linea) {
          linea = linea.trim(); 
          if (linea) {
            resp += linea;
          }
        });
        console.log('image response');
        res.status(200).send(resp);
      })
      .catch(function (error) {
        console.error("Error en la solicitud:", error);
        res.status(500).send('Error en la solicitud a marIA');
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


//////////////////
///  REGISTRO  ///
//////////////////

app.post('/api/user/register', upload.single('file'), async (req, res) => {
  console.log('register MESSAGE')
  const textPost = req.body;
  const uploadedFile = req.file;
  let objPost = {}
  
  try {
    objPost = JSON.parse(textPost.data)
  } catch (error) {
    res.status(400).send('Sol·licitud incorrecta.')
    console.log(error)
    return
  }

  try {
    var name = objPost.name
    var email = objPost.email
    var phone = objPost.phone
  } catch (error) {
    console.log(error);
    res.status(400).send('{status:"EROR", message:"Error en el JSON"}')
  }

  try {
    let url = 'http://localhost:8080/api/usuaris/registrar';
    var data = {
      telefon: phone,
      nickname: name,
      email: email
    };

    fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify(data)
    }).then(function (respuesta) {
      if (!respuesta.ok) {
        console.log('ERROR en la solicitud')
        throw new Error('Error en la solicitud.');
      }
      return respuesta.text();
    })
    .then(function (datosRespuesta) { 
      res.status(200).send(datosRespuesta); 
    })
    .catch(function (error) {
        console.error(error);
        res.status(400).send('Error en la solicitud a DBAPI'); 
    });
  } catch (error) {
    console.log(error);
    res.status(500).send('Error processing request.');
  }

})


////////////////////
///  VALIDACION  ///
////////////////////

app.post('/api/usuaris/validar', upload.single('file'), async (req, res) => {
  console.log('validation MESSAGE')
  const textPost = req.body;
  const uploadedFile = req.file;
  let objPost = {}
  
  try {
    objPost = JSON.parse(textPost)
  } catch (error) {
    res.status(400).send('Sol·licitud incorrecta.')
    console.log(error)
    return
  }

  try {
    var number = objPost.number;
    var phone = objPost.phone;
  } catch (error) {
    console.log(error);
    res.status(400).send('{status:"EROR", message:"Error en el JSON"}')
  }

  let url = "http://localhost:8080/api/usuaris/validar"
  var data = {
    telefon: phone,
    codi_validacio: number
  };

  fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify(data)
  }).then(function (respuesta) {
    if (!respuesta.ok) {
      console.log('ERROR en la solicitud')
      throw new Error('Error en la solicitud.');
    }
    return respuesta.text();
  })
  .then(function (datosRespuesta) { 
    res.status(200).send(datosRespuesta); 
  })
  .catch(function (error) {
      console.error(error);
      res.status(400).send('Error en la solicitud a DBAPI')
  });

  res.end("")

})


///////////////////
///  FUNCIONES  ///
///////////////////

async function sendPeticioToDBAPI(messageText, imageList) {
  console.log('sending to DBAPI');
  let url = "http://localhost:8080/api/peticions/afegir"
  var data = {
    model: "llava",
    prompt: messageText,
    imatges: imageList
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
        console.log('Error')
    }
    return response.text();
  })
  .then(function (textResponse) {
    console.log('Response:', textResponse);
  })
  .catch(function (error) {
    console.error('Fetch Error:', error);
  });

}