// Busca a planilha de produtos publicada no Google Sheets, corrige os
// links de imagem do Google Drive e salva o resultado em
// assets/data/produtos.json — que o site passa a ler em vez de
// depender do Google Sheets a cada visita.
//
// Uso: node scripts/atualizar-produtos.mjs
// (roda sozinho pela GitHub Action em .github/workflows/atualizar-produtos.yml)

import { writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';

const URL_PLANILHA =
  'https://docs.google.com/spreadsheets/d/e/2PACX-1vQYbdi6LWpprCxaGghzaM0YV_KgVr4hezP0M1ScZnPfgQgQ8nRy8VRt5aV0V-I8KNY-aizpHcwOlEko/pub?output=tsv';

const CAMINHO_SAIDA = fileURLToPath(
  new URL('../assets/data/produtos.json', import.meta.url)
);

// Converte um link de compartilhamento do Google Drive (que abre uma
// página) em um link de imagem direto que funciona dentro de um <img>.
function converterLinkImagem(url) {
  if (!url) return '';
  url = url.trim();

  const porArquivo = url.match(/drive\.google\.com\/file\/d\/([^/]+)/);
  const porId = url.match(/[?&]id=([^&]+)/);
  const id = (porArquivo && porArquivo[1]) || (porId && porId[1]);

  if (id) return `https://lh3.googleusercontent.com/d/${id}=w800`;
  return url; // já era um link direto (Imgur, ImgBB, caminho local, etc.)
}

function analisarTsv(tsv) {
  const linhas = tsv.split('\n');
  const produtos = [];

  for (let i = 1; i < linhas.length; i++) {
    const linha = linhas[i];
    if (!linha || !linha.trim()) continue;

    const [nome, descricao, imagem, preco] = linha.split('\t');
    if (!nome || !nome.trim()) continue; // linha incompleta: pula, sem quebrar o resto

    produtos.push({
      nome: nome.trim(),
      descricao: (descricao || '').trim(),
      imagem: converterLinkImagem(imagem),
      preco: (preco || '').trim(),
    });
  }

  return produtos;
}

async function main() {
  const resposta = await fetch(URL_PLANILHA);
  if (!resposta.ok) {
    throw new Error(`A planilha respondeu com status ${resposta.status}`);
  }

  const tsv = await resposta.text();
  const produtos = analisarTsv(tsv);

  await writeFile(CAMINHO_SAIDA, JSON.stringify(produtos, null, 2) + '\n', 'utf-8');
  console.log(`✔ ${produtos.length} produto(s) salvos em assets/data/produtos.json`);
}

main().catch((erro) => {
  console.error('Erro ao atualizar produtos:', erro);
  process.exit(1);
});