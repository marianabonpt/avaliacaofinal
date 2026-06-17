require("dotenv").config();

const express = require("express");
const mysql = require("mysql2/promise");

const app = express();
app.use(express.json());

const PORT = process.env.PORT || 3000;

const pool = mysql.createPool({
  host: process.env.DATABASE_HOST,
  port: Number(process.env.DATABASE_PORT || 3306),
  user: process.env.DATABASE_USER,
  password: process.env.DATABASE_PASSWORD,
  database: process.env.DATABASE_NAME,
});

const generosValidos = [
  "acao",
  "comedia",
  "drama",
  "terror",
  "ficcao",
  "documentario",
  "animacao",
  "outro",
];

function validarFilme(dados) {
  const { titulo, realizador, genero, ano, tipo, avaliacao } = dados;

  const anoAtual = new Date().getFullYear();

  if (!titulo || titulo.trim().length < 2) {
    return "O titulo deve ter pelo menos 2 caracteres.";
  }

  if (!realizador || realizador.trim() === "") {
    return "O realizador e obrigatorio.";
  }

  if (!genero || !generosValidos.includes(genero)) {
    return "O genero deve ser valido.";
  }

  if (!ano || isNaN(Number(ano)) || Number(ano) < 1900 || Number(ano) > anoAtual) {
    return "O ano deve ser um numero entre 1900 e o ano atual.";
  }

  if (!tipo || !["filme", "serie"].includes(tipo)) {
    return "O tipo deve ser filme ou serie.";
  }

  if (
    avaliacao !== undefined &&
    avaliacao !== null &&
    (isNaN(Number(avaliacao)) || Number(avaliacao) < 1 || Number(avaliacao) > 5)
  ) {
    return "A avaliacao deve ser um numero entre 1 e 5.";
  }

  return null;
}

app.get("/api/estado", (req, res) => {
  res.status(200).json({ mensagem: "API ativa" });
});

app.get("/api/filmes", async (req, res) => {
  try {
    const [filmes] = await pool.execute("SELECT * FROM filmes ORDER BY id");
    res.status(200).json(filmes);
  } catch (error) {
    res.status(500).json({ erro: "Erro ao listar filmes." });
  }
});

app.get("/api/filmes/:id", async (req, res) => {
  try {
    const id = Number(req.params.id);

    const [filmes] = await pool.execute(
      "SELECT * FROM filmes WHERE id = ?",
      [id]
    );

    if (filmes.length === 0) {
      return res.status(404).json({ erro: "Filme ou serie nao encontrado." });
    }

    res.status(200).json(filmes[0]);
  } catch (error) {
    res.status(500).json({ erro: "Erro ao procurar filme." });
  }
});

app.post("/api/filmes", async (req, res) => {
  try {
    const erroValidacao = validarFilme(req.body);

    if (erroValidacao) {
      return res.status(400).json({ erro: erroValidacao });
    }

    const { titulo, realizador, genero, ano, tipo, avaliacao, visto } = req.body;

    const [resultado] = await pool.execute(
      `INSERT INTO filmes 
      (titulo, realizador, genero, ano, tipo, avaliacao, visto)
      VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [
        titulo,
        realizador,
        genero,
        Number(ano),
        tipo,
        avaliacao ?? null,
        visto ?? false,
      ]
    );

    const [novoFilme] = await pool.execute(
      "SELECT * FROM filmes WHERE id = ?",
      [resultado.insertId]
    );

    res.status(201).json(novoFilme[0]);
  } catch (error) {
    res.status(500).json({ erro: "Erro ao criar filme." });
  }
});

app.put("/api/filmes/:id", async (req, res) => {
  try {
    const id = Number(req.params.id);

    const [filmes] = await pool.execute(
      "SELECT * FROM filmes WHERE id = ?",
      [id]
    );

    if (filmes.length === 0) {
      return res.status(404).json({ erro: "Filme ou serie nao encontrado." });
    }

    const erroValidacao = validarFilme(req.body);

    if (erroValidacao) {
      return res.status(400).json({ erro: erroValidacao });
    }

    const { titulo, realizador, genero, ano, tipo, avaliacao, visto } = req.body;

    await pool.execute(
      `UPDATE filmes
       SET titulo = ?, realizador = ?, genero = ?, ano = ?, tipo = ?, avaliacao = ?, visto = ?
       WHERE id = ?`,
      [
        titulo,
        realizador,
        genero,
        Number(ano),
        tipo,
        avaliacao ?? null,
        visto ?? false,
        id,
      ]
    );

    const [filmeAtualizado] = await pool.execute(
      "SELECT * FROM filmes WHERE id = ?",
      [id]
    );

    res.status(200).json(filmeAtualizado[0]);
  } catch (error) {
    res.status(500).json({ erro: "Erro ao atualizar filme." });
  }
});

app.patch("/api/filmes/:id/visto", async (req, res) => {
  try {
    const id = Number(req.params.id);

    const [filmes] = await pool.execute(
      "SELECT * FROM filmes WHERE id = ?",
      [id]
    );

    if (filmes.length === 0) {
      return res.status(404).json({ erro: "Filme ou serie nao encontrado." });
    }

    const filme = filmes[0];
    const novoEstado = !Boolean(filme.visto);

    await pool.execute(
      "UPDATE filmes SET visto = ? WHERE id = ?",
      [novoEstado, id]
    );

    const [filmeAtualizado] = await pool.execute(
      "SELECT * FROM filmes WHERE id = ?",
      [id]
    );

    res.status(200).json(filmeAtualizado[0]);
  } catch (error) {
    res.status(500).json({ erro: "Erro ao alterar visto." });
  }
});

app.delete("/api/filmes/:id", async (req, res) => {
  try {
    const id = Number(req.params.id);

    const [filmes] = await pool.execute(
      "SELECT * FROM filmes WHERE id = ?",
      [id]
    );

    if (filmes.length === 0) {
      return res.status(404).json({ erro: "Filme ou serie nao encontrado." });
    }

    await pool.execute("DELETE FROM filmes WHERE id = ?", [id]);

    res.status(204).send();
  } catch (error) {
    res.status(500).json({ erro: "Erro ao apagar filme." });
  }
});

app.listen(PORT, async () => {
  console.log(`Servidor a correr na porta ${PORT}`);

  try {
    await pool.execute("SELECT 1");
    console.log("Ligado a base de dados");
  } catch (error) {
    console.log("Erro na ligacao a base de dados:");
    console.log(error.message);
  }
});
