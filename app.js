const express = require('express');
const fs = require('fs').promises;
const path = require('path');
const multer = require('multer');
const bodyParser = require('body-parser');

const app = express();

// Vercel specific configuration
if (process.env.VERCEL) {
  app.use('/_next/static', express.static(path.join(__dirname, 'static')));
}

app.set('view engine', 'ejs');
app.use(express.static('public'));
app.use('/coral-data', express.static('coral-data'));
app.use(bodyParser.urlencoded({ extended: true }));

// Multer setup with async/await
const storage = multer.diskStorage({
  destination: async (req, file, cb) => {
    try {
      const coralId = req.body.coralId;
      const dir = path.join(process.cwd(), 'coral-data', coralId);
      await fs.mkdir(dir, { recursive: true });
      cb(null, dir);
    } catch (error) {
      cb(error);
    }
  },
  filename: (req, file, cb) => {
    // Sanitize filename
    const safeName = file.originalname.replace(/[^a-zA-Z0-9.-]/g, '');
    cb(null, safeName);
  }
});

const upload = multer({ 
  storage,
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB limit
    files: 4 // Max 4 files
  }
});

// Utility function to read coral data
async function getCoralData() {
  const coralDir = path.join(process.cwd(), 'coral-data');
  let corals = [];

  try {
    const folders = await fs.readdir(coralDir);
    
    corals = await Promise.all(folders.map(async folder => {
      const descPath = path.join(coralDir, folder, 'description.txt');
      const availPath = path.join(coralDir, folder, 'availability.txt');
      
      let description = 'No description available.';
      let availability = 'Unknown';
      
      try {
        description = await fs.readFile(descPath, 'utf-8');
        const availExists = await fs.stat(availPath).catch(() => false);
        if (availExists) {
          availability = (await fs.readFile(availPath, 'utf-8')).trim();
        }
      } catch (error) {
        console.error(`Error reading data for ${folder}:`, error);
      }

      const dirContents = await fs.readdir(path.join(coralDir, folder));
      const images = dirContents
        .filter(file => /\.(jpg|jpeg|png|webp)$/i.test(file))
        .map(file => `/coral-data/${folder}/${file}`);

      return {
        id: folder,
        name: folder.replace(/-/g, ' '),
        description,
        availability,
        images
      };
    }));
  } catch (error) {
    console.error('Error reading coral data:', error);
  }

  return corals;
}

// Error handling middleware
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).render('error', { 
    message: process.env.NODE_ENV === 'production' 
      ? 'Something went wrong!' 
      : err.message 
  });
});

// Routes
app.get('/', async (req, res) => {
  try {
    const corals = await getCoralData();
    res.render('index', { corals });
  } catch (error) {
    next(error);
  }
});

app.get('/contact', (req, res) => {
  res.render('contact');
});

app.get('/about', (req, res) => {
  res.render('about');
});

app.get('/coral/:id', async (req, res, next) => {
  try {
    const corals = await getCoralData();
    const coral = corals.find(c => c.id === req.params.id);
    if (coral) {
      res.render('coral', { coral });
    } else {
      res.status(404).render('error', { message: 'Coral not found' });
    }
  } catch (error) {
    next(error);
  }
});

app.get('/admin', async (req, res, next) => {
  try {
    const corals = await getCoralData();
    res.render('admin', { corals });
  } catch (error) {
    next(error);
  }
});

app.post('/upload', upload.array('images', 4), async (req, res, next) => {
  try {
    const { coralId, description, availability } = req.body;
    const coralDir = path.join(process.cwd(), 'coral-data', coralId);
    
    await fs.mkdir(coralDir, { recursive: true });
    await fs.writeFile(path.join(coralDir, 'description.txt'), description);
    await fs.writeFile(path.join(coralDir, 'availability.txt'), availability);
    
    res.redirect('/admin');
  } catch (error) {
    next(error);
  }
});

// Handle Vercel serverless function export
if (process.env.VERCEL) {
  module.exports = app;
} else {
  const port = process.env.PORT || 8080;
  app.listen(port, () => {
    console.log(`Laura's Lagoon listening at http://localhost:${port}`);
  });
}