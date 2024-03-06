const express = require('express')
const multer = require('multer');
const bodyParser = require('body-parser');
const fs = require('fs');
const path = require('path');

const app = express()
const port = process.env.PORT || 80

const storage = multer.memoryStorage();
const upload = multer({
  storage: storage,
  limits: { fileSize: 1000 * 1024 * 1024 }
});

app.use(express.static('public'))
app.use(bodyParser.urlencoded({ extended: true, limit: '10mb' }));
app.use(bodyParser.json({ limit: '10mb' }));
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


////////////////
///  IMAGEN  ///
////////////////

app.post('/api/maria/image', upload.single('file'), async (req, res) => {
  writeLog('image MESSAGE')
  const textPost = req.body;

  try {
    const userToken = textPost.token;

    const messageText = textPost.prompt;
    const imageList = [];      
    imageList.push(textPost.image);
    
    let url = 'http://192.168.1.14:11434/api/generate';
    var data = {
      model: "llava",
      prompt: messageText,
      images: imageList
    };

    sendPeticioToDBAPI(messageText, imageList, userToken).then(function(idPeticio) {
      writeLog('sending image to marIA')
      fetch(url, {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify(data)
      }).then(function (respuesta) {
        if (!respuesta.ok) {
          writeError('error en la resposta de marIA')
          res.status(400).send('Error en la resposta')
          throw new Error("Error en la resposta");
        }
        return respuesta.text();
      })
      .then(function (datosRespuesta) {
        writeLog('marIA responed ok')
        var lineas = datosRespuesta.split('\n');
        
        var objetosJSON = [];
        for (var i = 0; i < lineas.length; i++) {
          var linea = lineas[i].trim(); 
          if (linea) {
            objetosJSON.push(JSON.parse(linea));
          }
        }
        
        var resp = "";
        objetosJSON.forEach(function(objeto) {
          resp = resp + objeto.response;
        });
        
        console.log(resp)
        if ( idPeticio > 0 ) {
          var jsonResp = {
            status: "OK",
            message: "Resposta de la marIA",
            data: {
              response: resp
            }
          }          
        } else {
          var jsonResp = {
            status: "ERROR",
            message: "Algo ha ido mal :(",
            data: {}
          }
          resp = "Something went wrong! :("
        }
        
        console.log('Esto se envia a la app: ', jsonResp)
        res.status(200).send(jsonResp);
        writeLog('image responsed')
  
        sendResponseToDBAPI(userToken, idPeticio, resp);
      })
      .catch(function (error) {
        writeError('Error en la solicitud a marIA: ' + error);
        res.status(500).send('Error en la solicitud a marIA');
      });
    });

  } catch (error) {
    writeError('Error:' + error);
    res.status(500).send('Error processing request.');
  }
})


//////////////////
///  REGISTRO  ///
//////////////////

app.post('/api/user/register', upload.single('file'), async (req, res) => {
  writeLog('register MESSAGE')
  const textPost = req.body;

  try {
    var name = textPost.name
    var email = textPost.email
    var phone = textPost.phone
  } catch (error) {
    writeError('JSON error' + error);
    res.status(400).send('{status:"EROR", message:"Error en el JSON"}')
  }

  try {
    var validationCode = generateValidationCode()
    
    let url = 'http://localhost:8080/api/usuaris/registrar';
    var data = {
      telefon: phone,
      nickname: name,
      email: email,
      codi_validacio: validationCode
    };

    writeLog('sending user register')
    fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify(data)
    }).then(function (respuesta) {
      if (!respuesta.ok) {
        writeError('error en la resposta')
        throw new Error('Error en la resposta');
      }
      sendSMS(validationCode, textPost.phone);
      return respuesta.json();
    })
    .then(function (datosRespuesta) { 
      if (datosRespuesta.status == 'OK') {
        writeLog('user register status ok')
        res.status(200).send(datosRespuesta); 
      } else {
        writeError('user register status not OK')
        res.status(400).send(datosRespuesta); 
      }
    })
    .catch(function (error) {
        writeError('error en la solicitud a DBAPI ' + error)
        res.status(400).send('Error en la solicitud a DBAPI'); 
    });
  } catch (error) {
    writeError('Error: ' + error)
    res.status(500).send('Error processing request.');
  }

})


////////////////////
///  VALIDACION  ///
////////////////////

app.post('/api/usuaris/validar', upload.single('file'), async (req, res) => {
  writeLog('validation MESSAGE')
  const textPost = req.body;

  try {
    var number = textPost.number;
    var phone = textPost.phone;
  } catch (error) {
    writeError('JSON error: ' + error)
    res.status(400).send('{status:"EROR", message:"Error en el JSON"}')
  }

  let url = "http://localhost:8080/api/usuaris/validar"
  var data = {
    telefon: phone,
    codi_validacio: number
  };
  
  writeLog('sending validation user')
  fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify(data)
  })
  .then(function (respuesta) {
    if (!respuesta.ok) {
      writeError('error en la resposta');
      throw new Error('Error en la solicitud.');
    }
    return respuesta.json();
  })
  .then(function (datosRespuesta) { 
    if (datosRespuesta.status == 'OK') {
      writeLog('user validation status ok')
      res.status(200).send(datosRespuesta); 
    } else {
      writeError('user validation status not OK')
      res.status(400).send(datosRespuesta); 
    }
  })
  .catch(function (error) {
    writeError('error en la solicitud a DBAPI ' + error)
    res.send('Error en la solicitud a DBAPI');
  });

})


////////////////
///  LOG IN  ///
////////////////


app.post('/api/user/login', upload.single('file'), async (req, res) => {
  writeLog('login MESSAGE')
  const textPost = req.body;

  try {
    var email = textPost.user;
    var password = textPost.password;
  } catch (error) {
    writeError('JSON error: ' + error)
    res.status(400).send('{status:"EROR", message:"Error en el JSON"}')
  }

  let url = "http://localhost:8080/api/usuaris/login"
  var data = {
    email: email,
    password: password
  };

  writeLog('sending login user')
  fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify(data)
  }).then(function (respuesta) {
    if (!respuesta.ok) {
      writeError('error en la resposta');
      throw new Error('Error en la solicitud.');
    }
    return respuesta.json();
  })
  .then(function (datosRespuesta) { 
    if (datosRespuesta.status == 'OK') {
      writeLog('user login status ok')
      res.status(200).send(datosRespuesta); 
    } else {
      writeError('user login status not OK')
      res.status(400).send(datosRespuesta); 
    }
  })
  .catch(function (error) {
    writeError('error en la solicitud a DBAPI ' + error)
      res.status(400).send('Error en la solicitud a DBAPI')
  });

  // default response
  // res.write('{"status": "OK", "message": "Usuari autenticat correctament", "data": {"api_key": "D23qswfSgR6VM9cuTuN"}}')
  // res.end("")
})

////////////////////
///   GET LIST   ///
////////////////////


app.post('/api/users/admin_get_list', upload.single('file'), async (req, res) => {
  writeLog('admin_get_list MESSAGE')

  let url = "http://localhost:8080/api/usuaris/admin_obtenir_llista"

  adminToken = req.headers['authorization']
  console.log(adminToken);

  writeLog('asking for the list')
  fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": adminToken
    },
    body: {}
  }).then(function (respuesta) {
    if (!respuesta.ok) {
      writeError('error en la resposta');
      throw new Error('Error en la solicitud.');
    }
    return respuesta.json();
  })
  .then(function (datosRespuesta) { 
    if (datosRespuesta.status == 'OK') {
      writeLog('user list status ok')
      res.status(200).send(datosRespuesta); 
    } else {
      writeError('user list status not OK')
      res.status(400).send(datosRespuesta); 
    }
  })
  .catch(function (error) {
    writeError('error en la solicitud a DBAPI ' + error)
      res.status(400).send('Error en la solicitud a DBAPI')
  });
})


/////////////////////
///  CHANGE PLAN  ///
/////////////////////

app.post('/api/users/admin_change_plan', upload.single('file'), async (req, res) => {
  writeLog('change plan MESSAGE')
  const textPost = req.body;
  adminToken = req.headers['Authorization']

  var plan = textPost.plan
  
  let url = "http://localhost:8080/api/usuaris/admin_canvi_pla"
  var data = {
    "pla": plan
  };

  if (textPost.phone_number !== undefined) {
    data.telefon = textPost.phone_number;
  }
  
  // Verificar y añadir el campo "nombre" si está presente
  if (textPost.nickname !== undefined) {
    data.nickname = textPost.nickname;
  }
  
  // Verificar y añadir el campo "mail" si está presente
  if (textPost.email !== undefined) {
    data.email = textPost.email;
  }

  writeLog('sending change plan')
  fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": adminToken
    },
    body: data
  }).then(function (respuesta) {
    if (!respuesta.ok) {
      writeError('error en la resposta');
      throw new Error('Error en la solicitud.');
    }
    return respuesta.json();
  })
  .then(function (datosRespuesta) { 
    if (datosRespuesta.status == 'OK') {
      writeLog('change plan status ok')
      res.status(200).send(datosRespuesta); 
    } else {
      writeError('change plan status not OK')
      res.status(400).send(datosRespuesta); 
    }
  })
  .catch(function (error) {
    writeError('error en la solicitud a DBAPI ' + error)
      res.status(400).send('Error en la solicitud a DBAPI')
  });
})


///////////////////
///  FUNCIONES  ///
///////////////////

function sendPeticioToDBAPI(messageText, imageList, token) {
  writeLog('sending peticio to DBAPI')
  let url = "http://localhost:8080/api/peticions/afegir"
  var data = {
    model: "llava",
    prompt: messageText,
    imatges: imageList
  };

  // Devuelve la promesa de fetch
  return fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": 'Bearer ' + token
    },
    body: JSON.stringify(data)
  })
  .then(function (response) {
    if (!response.ok) {
      writeError('response DBAPI error')
      throw new Error('Error en la solicitud.');
    }
    return response.json();
  })
  .then(function (jsonResponse) {
    if (jsonResponse.status == "OK" ) {
      var id = jsonResponse.data.id;
      writeLog('DBAPI response status ok')
      return id
    } else {
      writeError('response DBAPI status not OK')
      return -1
    }
  })
  .catch(function (error) {
    writeError('Fetch error: '+ error)
  });
}

async function sendResponseToDBAPI(token, idPeticio, resposta) {
  writeLog('sending response to DBAPI');
  let url = "http://localhost:8080/api/respostes/afegir"
  var data = {
    id_peticio: idPeticio,
    text_generat: resposta
  };

  fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": 'Bearer ' + token
    },
    body: JSON.stringify(data)
  })
  .then(function (response) {
    if (!response.ok) {
      writeError('response DBAPI error')
      throw new Error('Error en la solicitud.');
    }
    return response.json();
  })
  .then(function (jsonResponse) {
    if (jsonResponse.status == "OK" ) {
      var id = jsonResponse.data.id;
      writeLog('DBAPI response status ok')
      return id
    } else {
      writeError('response DBAPI status not OK')
      return 0
    }
  })
  .catch(function (error) {
    writeError('Fetch error: '+ error)
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
  writeLog('sending SMS')
  var apiToken = 'aKcoakJ4ZMC41GzhJIM4gbXj68JO4uxMuuEhsflzdh5vUe5gpzSf2vbbI7GB90bp'
  var user = 'ams22'
  var text = 'EchoVisionTech: your validation code is ' + validationCode
  var message = 'http://192.168.1.16:8000/api/sendsms/?api_token=' + apiToken + '&username=' + user + '&text='+ text + '&receiver=' + telephoneNum
  try {
    const response = await fetch(message);
    const data = await response.text();
    writeLog('SMS: ' + data);
  } catch (error) {
    writeError('Error executing cURL:' + error)
  }
}

function writeLog(message) {
  message = '>> ' + message
  console.log(message)
  const logFilePath = path.join(__dirname, 'logs.txt'); // Ruta del archivo de logs

  // Agregar la fecha y hora actual al mensaje de log
  const timestamp = new Date().toISOString();
  const logMessage = `${timestamp}: ${message}\n`;

  // Escribir en el archivo de logs
  fs.appendFile(logFilePath, logMessage, (err) => {
      if (err) {
          console.error('>>>>>> Error al escribir en el archivo de logs:', err);
      }
  });
}

function writeError(errorMessage) {
  errorMessage = '>>> [ERROR] ' + errorMessage
  console.log(errorMessage)
  const logFilePath = path.join(__dirname, 'logs.txt'); // Ruta del archivo de logs

  // Agregar la fecha y hora actual al mensaje de log
  const timestamp = new Date().toISOString();
  const logMessage = `${timestamp}: ${errorMessage}\n`;

  // Escribir en el archivo de logs
  fs.appendFile(logFilePath, logMessage, (err) => {
      if (err) {
          console.error('>>>>>> Error al escribir en el archivo de logs:', err);
      }
  });
}
