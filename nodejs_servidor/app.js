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

    var validationCode = generateValidationCode()

    var data = {
      telefon: phone,
      nickname: name,
      email: email,
      codi_validacio: validationCode
    };

    sendSMS(validationCode, objPost.phone);

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


////////////////
///  LOG IN  ///
////////////////

app.post('/api/user/login', upload.single('file'), async (req, res) => {
  console.log('login MESSAGE')
  const textPost = req.body;
  const uploadedFile = req.file;


  try {
    var email = textPost.user;
    var password = textPost.password;
  } catch (error) {
    console.log(error);
    res.status(400).send('{status:"EROR", message:"Error en el JSON"}')
  }

  // let url = "http://localhost:8080/api/usuaris/validar"
  // var data = {
  //   telefon: phone,
  //   codi_validacio: number
  // };

  // fetch(url, {
  //   method: "POST",
  //   headers: {
  //     "Content-Type": "application/json"
  //   },
  //   body: JSON.stringify(data)
  // }).then(function (respuesta) {
  //   if (!respuesta.ok) {
  //     console.log('ERROR en la solicitud')
  //     throw new Error('Error en la solicitud.');
  //   }
  //   return respuesta.text();
  // })
  // .then(function (datosRespuesta) { 
  //   res.status(200).send(datosRespuesta); 
  // })
  // .catch(function (error) {
  //     console.error(error);
  //     res.status(400).send('Error en la solicitud a DBAPI')
  // });

  res.write("user recived")
  res.end("")

  console.log('response sended')

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

function generateValidationCode() {
  let code = '';
    for (let i = 0; i < 6; i++) {
      code += Math.floor(Math.random() * 10);
    }
    return code;
}

async function sendSMS(validationCode, telephoneNum) {
  var apiToken = 'aKcoakJ4ZMC41GzhJIM4gbXj68JO4uxMuuEhsflzdh5vUe5gpzSf2vbbI7GB90bp'
  var user = 'ams22'
  var text = 'EchoVisionTech: your validation code is ' + validationCode
  try {
    const response = await fetch('http://192.168.1.16:8000/api/sendsms/?api_token=' + apiToken + '&username=' + user + '&text='+ text + '&receiver=' + telephoneNum );
    const data = await response.text();
    console.log(data); // Output the response data
  } catch (error) {
    console.error('Error executing cURL:', error);
  }
}
