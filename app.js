const express = require('express');
const fs = require('fs');
const path = require('path');
const multer = require('multer');
const bodyParser = require('body-parser');

const app = express();
const port = 3000;

app.set('view engine', 'ejs');
app.use(express.static('public'));
app.use('/coral-data', express.static('coral-data'));
app.use(bodyParser.urlencoded({ extended: true }));

// Multer setup for file uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const coralId = req.body.coralId;
    const dir = `./coral-data/${coralId}`;
    fs.mkdirSync(dir, { recursive: true });
    cb(null, dir);
  },
  filename: (req, file, cb) => {
    cb(null, file.originalname);
  }
});
const upload = multer({ storage: storage });

// Read coral data
function getCoralData() {
  const coralDir = path.join(__dirname, 'coral-data');
  let corals = [];

  try {
    if (fs.existsSync(coralDir)) {
      corals = fs.readdirSync(coralDir).map(folder => {
        const descPath = path.join(coralDir, folder, 'description.txt');
        const availPath = path.join(coralDir, folder, 'availability.txt');
        let description = 'No description available till now.';
        let availability = 'Unknown';
        try {
          description = fs.readFileSync(descPath, 'utf-8');
          if (fs.existsSync(availPath)) {
            availability = fs.readFileSync(availPath, 'utf-8').trim();
          }
        } catch (error) {
          console.error(`Error reading data for ${folder}:`, error);
        }
        const images = fs.readdirSync(path.join(coralDir, folder))
          .filter(file => file.toLowerCase().endsWith('.jpg'))
          .map(file => `/coral-data/${folder}/${file}`);
        return {
          id: folder,
          name: folder.replace(/-/g, ' '),
          description,
          availability,
          images
        };
      });
    } else {
      console.error('coral-data directory does not exist');
    }
  } catch (error) {
    console.error('Error reading coral data:', error);
  }

  return corals;
}

// Home page
app.get('/', (req, res) => {
  const corals = getCoralData();
  console.log('Loaded corals:', corals);
  res.render('index', { corals });
});

// Contact page
app.get('/contact', (req, res) => {
  res.render('contact');
});

// About page
app.get('/about', (req, res) => {
  res.render('about');
});


// Individual coral page
app.get('/coral/:id', (req, res) => {
  const corals = getCoralData();
  const coral = corals.find(c => c.id === req.params.id);
  if (coral) {
    res.render('coral', { coral });
  } else {
    res.status(404).send('Coral not found');
  }
});

// Admin page
app.get('/admin', (req, res) => {
  const corals = getCoralData();
  res.render('admin', { corals });
});

// Handle file upload
app.post('/upload', upload.array('images', 4), (req, res) => {
  const { coralId, description, availability } = req.body;
  const coralDir = path.join(__dirname, 'coral-data', coralId);
  fs.mkdirSync(coralDir, { recursive: true });
  fs.writeFileSync(path.join(coralDir, 'description.txt'), description);
  fs.writeFileSync(path.join(coralDir, 'availability.txt'), availability);
  res.redirect('/admin');
});

app.listen(port, () => {
  console.log(`Laura's Lagoon listening at http://localhost:${port}`);
});