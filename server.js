const express = require('express');
const fs = require('fs');
const path = require('path');
const multer = require('multer');
const bodyParser = require('body-parser');
const { promisify } = require('util');

const app = express();
const port = 8080;

app.set('view engine', 'ejs');
app.use(express.static('public'));
app.use('/coral-data', express.static('coral-data'));
app.use(bodyParser.urlencoded({ extended: true }));

// Promisified functions for async/await
const mkdir = promisify(fs.mkdir);
const writeFile = promisify(fs.writeFile);
const readdir = promisify(fs.readdir);
const readFile = promisify(fs.readFile);
const exists = promisify(fs.exists);

const storage = multer.diskStorage({
  destination: async (req, file, cb) => {
    try {
      const coralId = req.body.coralId;
      const dir = `./coral-data/${coralId}`;
      await mkdir(dir, { recursive: true });
      cb(null, dir);
    } catch (error) {
      cb(error);
    }
  },
  filename: (req, file, cb) => {
    cb(null, file.originalname);
  }
});

const upload = multer({ storage: storage });

async function getCoralData() {
  const coralDir = path.join(__dirname, 'coral-data');
  let corals = [];

  try {
    if (await exists(coralDir)) {
      const folders = await readdir(coralDir);
      corals = await Promise.all(folders.map(async folder => {
        const descPath = path.join(coralDir, folder, 'description.txt');
        const availPath = path.join(coralDir, folder, 'availability.txt');
        let description = 'No description available till now.';
        let availability = 'Unknown';

        try {
          if (await exists(descPath)) {
            description = await readFile(descPath, 'utf-8');
          }
          if (await exists(availPath)) {
            availability = (await readFile(availPath, 'utf-8')).trim();
          }
        } catch (error) {
          console.error(`Error reading data for ${folder}:`, error);
        }

        const images = (await readdir(path.join(coralDir, folder)))
          .filter(file => file.toLowerCase().endsWith('.jpg'))
          .map(file => `/coral-data/${folder}/${file}`);

        return {
          id: folder,
          name: folder.replace(/-/g, ' '),
          description,
          availability,
          images
        };
      }));
    } else {
      console.error('coral-data directory does not exist');
    }
  } catch (error) {
    console.error('Error reading coral data:', error);
  }

  return corals;
}

app.get('/', async (req, res) => {
  const corals = await getCoralData();
  console.log('Loaded corals:', corals);
  res.render('index', { corals });
});

app.get('/contact', (req, res) => {
  res.render('contact');
});

app.get('/about', (req, res) => {
  res.render('about');
});

app.get('/coral/:id', async (req, res) => {
  const corals = await getCoralData();
  const coral = corals.find(c => c.id === req.params.id);
  if (coral) {
    res.render('coral', { coral });
  } else {
    res.status(404).send('Coral not found');
  }
});

app.get('/admin', async (req, res) => {
  const corals = await getCoralData();
  res.render('admin', { corals });
});

app.post('/upload', upload.array('images', 4), async (req, res) => {
  const { coralId, description, availability } = req.body;
  const coralDir = path.join(__dirname, 'coral-data', coralId);

  try {
    await mkdir(coralDir, { recursive: true });
    await writeFile(path.join(coralDir, 'description.txt'), description);
    await writeFile(path.join(coralDir, 'availability.txt'), availability);
    console.log('Files written successfully');
  } catch (error) {
    console.error('Error in file operations:', error);
  }

  res.redirect('/admin');
});

app.listen(port, () => {
  console.log(`Laura's Lagoon listening at http://localhost:${port}`);
});
