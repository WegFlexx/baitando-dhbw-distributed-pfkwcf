const fs = require('fs');
const express = require("express");
const crypto = require("crypto");

const app = express();

app.use(express.json());

const dataFilePath = './data.json';

const swaggerUi = require('swagger-ui-express');
const swaggerDocument = require('yaml').parse(fs.readFileSync('./spec/powertrack.yaml', 'utf8'));
app.use('/swagger-ui', swaggerUi.serve, swaggerUi.setup(swaggerDocument));

app.listen(8080, () => {
    console.log("Server up and running");
});

function generateId() {
    return crypto.randomUUID();
}
function getRecordUrl(req, recordId) {
    return `${req.protocol}://${req.header('host')}/records/${recordId}`;
}

function validateRecord(record) {
    const dateRegex = new RegExp("^\\d{4}\-(0[1-9]|1[012])\-(0[1-9]|[12][0-9]|3[01])$");
    return record &&
        record.date && typeof record.date === "string" && dateRegex.test(record.date) &&
        record.reading && typeof record.reading === "number";
}

// Helper function to read the data from the JSON file
function readDataFromFile() {
    try {
      const data = fs.readFileSync(dataFilePath, 'utf8');
      return JSON.parse(data);
    } catch (err) {
      console.error('Error reading data from file:', err);
      return [];
    }
  }
  
  // Helper function to write the data to the JSON file
  function writeDataToFile(data) {
    try {
      fs.writeFileSync(dataFilePath, JSON.stringify(data, null, 2), 'utf8');
    } catch (err) {
      console.error('Error writing data to file:', err);
    }
  }

  // GET /records
app.get('/records', (req, res) => {
    const data = readDataFromFile();
    res.json({ items: data });
  });
  
  // POST /records
  app.post('http://localhost:8080/records', (req, res) => {
    const { date, reading } = req.body;
  
    if (!date || !reading) {
      res.status(400).send('Invalid request data');
      return;
    }
  
    const isValid = validateRecord(req.body);
    if (!isValid) {
      res.status(400).send('Invalid record data');
      return;
    }
  
    const data = readDataFromFile();
    const id = generateId();
    const record = { id, date, reading };
    data.push(record);
    writeDataToFile(data);
  
    const recordUrl = getRecordUrl(req, id);
    res.status(201).header('Location', recordUrl).send();
  });
  
  // GET /records/{record-id}
  app.get('/records/:recordId', (req, res) => {
    const { recordId } = req.params;
  
    const data = readDataFromFile();
    const record = data.find((item) => item.id === recordId);
  
    if (!record) {
      res.status(404).send('Record not found');
      return;
    }
  
    res.json(record);
  });
  
  // DELETE /records/{record-id}
  app.delete('/records/:recordId', (req, res) => {
    const { recordId } = req.params;
  
    const data = readDataFromFile();
    const index = data.findIndex((item) => item.id === recordId);
  
    if (index === -1) {
      res.status(404).send('Record not found');
      return;
    }
  
    data.splice(index, 1);
    writeDataToFile(data);
  
    res.status(204).send();
  });
  
  // DELETE /records
  app.delete('/records', (req, res) => {
    writeDataToFile([]);
    res.status(204).send();
  });
  
  // Error handler
  app.use((err, req, res, next) => {
    console.error(err);
    res.status(500).send('Internal Server Error');
  });