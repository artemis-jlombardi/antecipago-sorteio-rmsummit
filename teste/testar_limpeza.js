// Testa a limpeza do CSV usando a MESMA lógica do index.html.
// Uso: node teste/testar_limpeza.js [arquivo.csv]
const fs = require('fs'), path = require('path'), vm = require('vm');

const html = fs.readFileSync(path.join(__dirname, '..', 'index.html'), 'utf8');
const codigo = html.match(/<script id="logica">([\s\S]*?)<\/script>/)[1];
const ctx = { crypto: globalThis.crypto, Uint32Array };
vm.createContext(ctx);
vm.runInContext(codigo + '\nthis.Logica = Logica;', ctx);
const L = ctx.Logica;

const arq = process.argv[2] || path.join(__dirname, 'participantes_teste.csv');
const r = L.limpar(fs.readFileSync(arq, 'utf8'));
if (r.erro) { console.error('ERRO:', r.erro); process.exit(1); }

console.log('Colunas:', r.colunas);
console.log('Números:', r.stats);
console.table(r.participantes.map(p => ({ nome: p.nome, tel: p.tel, email: p.email })));

if (process.argv[2]) process.exit(0);

// Conferências do CSV de teste
let falhas = 0;
const ok = (cond, msg) => { console.log((cond ? '  ok   ' : '  FALHA ') + msg); if (!cond) falhas++; };
const nomes = r.participantes.map(p => p.nome);
const tels = r.participantes.map(p => p.tel);
console.log('\nConferências:');
ok(r.stats.linhas === 13, '13 respostas (linha em branco ignorada)');
ok(r.stats.incompletos === 3, '3 sem nome ou telefone (Ana sem telefone, nome em branco, Luíza com "sem telefone")');
ok(r.stats.repetidos === 3, '3 telefones repetidos (Maria +55, Carlos 21 98888, Roberto 3132221100)');
ok(r.stats.validos === 7, '7 participantes válidos');
ok(nomes[0] === 'Maria da Silva Souza', 'nome formatado: Maria da Silva Souza');
ok(!nomes.includes('Maria Souza (de novo)'), 'entre repetidos fica o primeiro do arquivo (Maria)');
ok(nomes.includes('Carlos Eduardo Moura-Lima') && !nomes.includes('Carlos E. Moura'), '5521988887777 = 21 98888-7777, fica o primeiro');
ok(nomes.includes('Roberto de Almeida e Castro') && !nomes.includes('Roberto Almeida'), '55 (31) 3222-1100 = 3132221100, fica o primeiro');
ok(nomes.includes('João Pedro dos Santos'), 'minúsculas viram João Pedro dos Santos');
ok(nomes.includes('José Antônio Ávila'), 'maiúsculas com acento viram José Antônio Ávila');
ok(nomes.includes('Patrícia Gomes'), 'quebra de linha dentro do nome vira espaço');
ok(nomes.includes('Fernanda Oliveira, Oab/sp'), 'vírgula dentro de aspas não quebra a coluna');
ok(!nomes.some(n => n.startsWith('Ana Beatriz')), 'linha sem telefone sai');
ok(!tels.includes(''), 'nenhum telefone vazio');
ok(tels.includes('01133334444'), 'telefone com 0 na frente fica só com dígitos (11 dígitos, sem 55)');
ok(!nomes.includes('Luíza Andrade'), 'texto sem dígitos no telefone conta como sem telefone');
ok(L.normalizaTelefone('+55 (11) 98765-4321') === '11987654321', 'normaliza +55 com 13 dígitos');
ok(L.normalizaTelefone('5511987654321') === '11987654321', 'normaliza 55 sem formatação');
ok(L.normalizaTelefone('551133334444') === '1133334444', 'normaliza 55 com 12 dígitos');
ok(L.normalizaTelefone('11987654321') === '11987654321', 'número sem 55 fica igual');
ok(L.encontraColunas(['carimbo', ' NOME COMPLETO ', 'Telefone (com ddd)', 'E-MAIL', 'Consentimento para o sorteio ']).telefone === 2, 'colunas achadas sem diferenciar maiúscula');
ok(L.encontraColunas(['Nome', 'Email', 'Celular / WhatsApp']).email === 1, 'tolera formulário alterado (Email, Celular)');

// Sorteio: distribuição uniforme
const cont = [0, 0, 0, 0, 0, 0, 0];
for (let i = 0; i < 70000; i++) cont[L.sorteiaIndice(7)]++;
ok(cont.every(c => Math.abs(c - 10000) < 600), 'sorteiaIndice uniforme em 70 mil sorteios: ' + cont.join(' '));

console.log(falhas ? `\n${falhas} falha(s).` : '\nTudo certo.');
process.exit(falhas ? 1 : 0);
