const express = require('express');
const mysql = require('mysql2');
const cors = require('cors');
const bodyParser = require('body-parser');

const app = express();

// Middleware
app.use(cors());
app.use(bodyParser.json());

// Configuração do banco de dados MySQL
const db = mysql.createConnection({
  host: 'sensordb.cpum6aqq2r5m.eu-north-1.rds.amazonaws.com',
  user: 'Cassiano',
  password: 'cassiano3241',
  database: 'sensor_db'
});

// Conexão com o banco de dados
db.connect((err) => {
  if (err) {
    console.error('Erro de conexão: ' + err.stack);
    return;
  }
  console.log('Conectado ao banco de dados MySQL');
});

// Rota para inserir leituras do ESP8266
app.post('/dados', (req, res) => {
  const { estacao_id, distancia } = req.body;

  if (!estacao_id || !distancia) {
    return res.status(400).json({ error: 'Dados inválidos' });
  }

  const query = 'INSERT INTO leituras (estacao_id, distancia) VALUES (?, ?)';
  db.query(query, [estacao_id, distancia], (err) => {
    if (err) {
      console.error('Erro ao inserir dados: ' + err.stack);
      return res.status(500).json({ error: 'Erro ao inserir dados' });
    }
    res.status(200).json({ message: 'Dados inseridos com sucesso' });
  });
});

// Rota para retornar dados gerais de estações
app.get('/estacoes', (req, res) => {
  const query = `
    SELECT e.id, e.nome, e.latitude, e.longitude, e.cidade, e.estado,
           MAX(l.distancia) AS ultima_leitura,
           AVG(CASE WHEN l.timestamp >= NOW() - INTERVAL 1 HOUR THEN l.distancia END) AS media_1h,
           AVG(CASE WHEN l.timestamp >= NOW() - INTERVAL 5 HOUR THEN l.distancia END) AS media_5h,
           AVG(CASE WHEN l.timestamp >= NOW() - INTERVAL 12 HOUR THEN l.distancia END) AS media_12h
    FROM estacoes e
    LEFT JOIN leituras l ON e.id = l.estacao_id
    GROUP BY e.id;
  `;

  db.query(query, (err, results) => {
    if (err) {
      console.error('Erro ao consultar estações: ' + err.stack);
      return res.status(500).json({ error: 'Erro ao consultar estações' });
    }
    res.status(200).json(results);
  });
});

// Rota para retornar dados detalhados de uma estação
app.get('/estacoes/:id', (req, res) => {
  const { id } = req.params;

  const query = `
    SELECT e.id, e.nome, e.latitude, e.longitude, e.cidade, e.estado,
           l.distancia, l.timestamp
    FROM estacoes e
    LEFT JOIN leituras l ON e.id = l.estacao_id
    WHERE e.id = ?
    ORDER BY l.timestamp DESC
  `;

  db.query(query, [id], (err, results) => {
    if (err) {
      console.error('Erro ao consultar dados da estação: ' + err.stack);
      return res.status(500).json({ error: 'Erro ao consultar dados da estação' });
    }
    res.status(200).json(results);
  });
});

// Servidor
const PORT = 5000;
app.listen(PORT, () => {
  console.log(`API rodando na porta ${PORT}`);
});
