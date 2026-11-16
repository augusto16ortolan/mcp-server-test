import { test } from 'node:test';
import assert from 'node:assert/strict';
import { carregarCatalogo, criarConsultas, validarCatalogo, GENEROS } from '../src/catalogo.mjs';
const filmes = carregarCatalogo(new URL('../dados/filmes.json', import.meta.url));
const consultas = criarConsultas(filmes);

test('catálogo didático: 60 registros válidos, 48 disponíveis e todos os gêneros', () => {
  assert.equal(filmes.length, 60);
  assert.equal(filmes.filter(f => f.disponivel).length, 48);
  assert.equal(new Set(filmes.map(f => f.titulo)).size, 60);
  assert.deepEqual(new Set(filmes.flatMap(f => f.generos)), new Set(GENEROS));
  assert.throws(() => validarCatalogo([...filmes, filmes[0]]), /duplicados/);
  assert.throws(() => validarCatalogo([{ ...filmes[0], duracao_minutos: -1 }]));
});
test('filtros combinados e duração inclusiva', () => {
  const r = consultas.buscar({ genero: 'comédia', clima: 'leve', duracao_maxima: 89, idade_publico: 0 });
  assert.deepEqual(r.filmes.map(f => f.id), ['FILME-002', 'FILME-004']);
  assert.equal(r.total, 2);
  assert.ok(r.filmes.every(f => !('sinopse' in f)));
});
test('indisponíveis excluídos por padrão, incluídos explicitamente', () => {
  assert.equal(consultas.buscar({}).total, 48);
  assert.equal(consultas.buscar({ somente_disponiveis: false }).total, 60);
  assert.equal(consultas.obterDetalhes({ id: 'FILME-005' }).filme.disponivel, false);
});
test('idade zero é um filtro válido e não um valor ausente', () => {
  const r = consultas.buscar({ idade_publico: 0, limite: 10 });
  assert.ok(r.total > 0 && r.total < 48);
  assert.ok(r.filmes.every(f => f.idade_minima_sugerida === 0));
});
test('paginação completa, determinística e sem duplicações', () => {
  const ids = []; let offset = 0;
  do {
    const pagina = consultas.buscar({ limite: 7, offset });
    assert.ok(pagina.filmes.length <= 7);
    ids.push(...pagina.filmes.map(f => f.id));
    offset = pagina.proximo_offset;
  } while (offset !== null);
  assert.equal(ids.length, 48);
  assert.equal(new Set(ids).size, 48);
  assert.deepEqual(consultas.buscar({ limite: 7 }).filmes.map(f => f.id), ids.slice(0, 7));
  assert.equal(consultas.buscar({ offset: 999 }).proximo_offset, null);
});
test('sem resultado não relaxa filtros nem inventa registros', () => {
  const r = consultas.buscar({ genero: 'suspense', idade_publico: 0, duracao_maxima: 30 });
  assert.equal(r.total, 0); assert.deepEqual(r.filmes, []);
  assert.equal(r.proximo_offset, null);
  assert.equal(consultas.obterDetalhes({ id: 'FILME-999' }).encontrado, false);
});
test('validação recusa entradas inválidas e parâmetros desconhecidos', () => {
  for (const a of [{ limite: 11 }, { offset: -1 }, { duracao_maxima: '90' }, { idade_publico: 19 }, { comando: 'apagar' }]) {
    assert.throws(() => consultas.buscar(a));
  }
});
