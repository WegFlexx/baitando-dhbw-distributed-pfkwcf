const fs = require('fs');
const express = require("express");
const crypto = require("crypto");
const app = express();
const dataFilePath = './data.json';

app.use(express.json());

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

// Function to write the data to the JSON file
function writeDataToFile(data) {
    try {
        fs.writeFileSync(dataFilePath, JSON.stringify(data, null, 2), 'utf8');
        return 1;
    } catch (writingError) {
        console.error('Error writing data to file:', writingError);
        return 0;
    }
}

// Function to read the data from the JSON file
function readDataFromFile() {
    try {
      const data = fs.readFileSync(dataFilePath, 'utf8');
      return JSON.parse(data);
    } catch (readingError) {
      console.error('Error reading data from file:', readingError);
      return 0;
    }
}

// GET /records
app.get('/records', (req, response) => {
    const data = readDataFromFile();
    if (data === 0) {
        response.status(500).send();
    } else {
        response.status(200).send(data);
    }
});

// GET /records/{record-id}
app.get('/records/:recordId', (req, response) => {
    const { recordId } = req.params;
    const data = readDataFromFile();
    if (data === 0) {
        response.status(500).send('Internal server error. The response payload is empty.');
        return;  
    }
    const record = data.find((item) => item.id === recordId);

    if (!record) {
        response.status(404).send('Power record with given ID does not exist. The response payload is empty.');
        return;
    } else {
        response.status(200).json({ items: record, message: 'Power record retrieved successfully.' });
    }
});
  
// POST /records
app.post('/records', (req, response) => {
    const { date, reading } = req.body;

    if (!date || !reading) {
        response.status(400).send('Invalid request data. Occurs, if a required attribute in the request payload is missing. The response payload is empty.');
        return;
    }

    const isValid = validateRecord(req.body);
    if (!isValid) {
        response.status(400).send('Invalid request data. Occurs, if a required attribute in the request payload is missing. The response payload is empty.');
        return;
    }

    const data = readDataFromFile();
    const id = generateId();
    const record = { id, date, reading };
    data.push(record);
    let writingSuccessfull = writeDataToFile(data);

    if (writingSuccessfull === 1) {
        const recordUrl = getRecordUrl(req, id);
        response.status(201).header('Location', recordUrl).send('Record created successfully. The response payload is empty.');
    } else {
        response.status(500).send('Internal server error. The response payload is empty.');
    }
});

// DELETE /records
app.delete('/records', (req, response) => {
    let writingSuccessfull = writeDataToFile([]);
    if (writingSuccessfull === 1) {
        response.status(204).send('All power records deleted successfully. The response payload is empty.');
    }
    else {
        response.status(500).send('Internal server error. The response payload is empty.');
    }
});

// DELETE /records/{record-id}
app.delete('/records/:recordId', (req, response) => {
    const { recordId } = req.params;
    const data = readDataFromFile();
    const index = data.findIndex((item) => item.id === recordId);

    if (index === -1) {
        response.status(404).send('Power record with given ID does not exist. The response payload is empty.');
        return;
    }

    data.splice(index, 1);
    let writingSuccessfull = writeDataToFile(data);
    if (writingSuccessfull) {
        response.status(204).send('Power record deleted successfully. The response payload is empty.');
        return;
    }
    else {
        response.status(500).send('Internal server error. The response payload is empty.');
        return;
    }
});

// Error handler
app.use((err, req, response, next) => {
    console.error(err);
    response.status(500).send('Internal Server Error');
});