import { test } from 'node:test';
import assert from 'node:assert/strict';
import { carregarCatalogo, criarConsultas, validarCatalogo } from '../src/catalogo.mjs';
const filmes = carregarCatalogo(new URL('../dados/filmes.json', import.meta.url));
const c = criarConsultas(filmes);

test('título e nomes ignoram acentos/caixa; coleção preserva ordem na ficha', () => {
  assert.equal(c.buscar({ titulo:'ONIBUS' }).filmes[0].id, 'FILME-001');
  assert.equal(c.buscar({ diretor:'valenca', titulo:'onibus', pais:'brasil' }).total, 1);
  assert.equal(c.buscar({ colecao:'viagens impossiveis' }).total, 2); // terceiro indisponível
  assert.equal(c.obterDetalhes({id:'FILME-001'}).filme.colecao.ordem, 1);
});
test('OU, E, exclusões e compatibilidade com filtro singular', () => {
  const todos=c.buscar({ generos:['comédia','ficção científica'],modo_generos:'todos' });
  assert.deepEqual(todos.filmes.map(f=>f.id), ['FILME-001']);
  assert.ok(c.buscar({generos:['comédia','ficção científica']}).total>todos.total);
  assert.equal(c.buscar({genero:'comédia',excluir_generos:['comédia']}).total,0);
  assert.ok(c.buscar({generos:['comédia','ficção científica'],excluir_generos:['comédia']}).filmes.every(f=>!f.generos.includes('comédia')));
});
test('ano, áudio, temas, intervalo de duração e conteúdo', () => {
  const r=c.buscar({ano_minimo:2000,ano_maximo:2020,audio:'PORTUGUES',temas:['amizade'],duracao_minima:70,duracao_maxima:100,excluir_conteudos:['cenas de tensão'],limite:10});
  assert.ok(r.total>0);
  for(const f of r.filmes) {
    assert.ok(f.ano<=2020 && f.ano>=2000);
    assert.ok(f.audios.includes('português') && f.temas.includes('amizade'));
    assert.ok(f.duracao_minutos>=70 && f.duracao_minutos<=100);
    assert.ok(!f.avisos_conteudo.includes('cenas de tensão'));
  }
  assert.throws(()=>c.buscar({duracao_minima:100,duracao_maxima:90}));
  assert.throws(()=>c.buscar({ano:2010,ano_minimo:2020}));
  assert.throws(()=>c.buscar({generos:['comédia','comédia']}));
});
test('ordenação e paginação numéricas', () => {
  const a=c.buscar({ordenar_por:'duracao',ordem:'asc',limite:10});
  assert.equal(a.filmes[0].duracao_minutos,73);
  assert.ok(a.filmes.every((f,i)=>i===0 || f.duracao_minutos>=a.filmes[i-1].duracao_minutos));
  const b=c.buscar({ordenar_por:'ano',ordem:'desc',limite:10});
  assert.ok(b.filmes.every((f,i)=>i===0 || f.ano<=b.filmes[i-1].ano));
  assert.deepEqual(c.buscar({ordenar_por:'duracao',limite:2,offset:2}).filmes.map(f=>f.id),a.filmes.slice(2,4).map(f=>f.id));
});
test('comparação mantém ordem, aponta ausentes e rejeita duplicações', () => {
  const r=c.comparar({ids:['FILME-004','FILME-001','FILME-999']});
  assert.equal(r.completa,false);
  assert.deepEqual(r.filmes.map(f=>f.id),['FILME-004','FILME-001']);
  assert.deepEqual(r.ids_nao_encontrados,['FILME-999']);
  assert.equal(r.diferenca_duracao_minutos,16);
  assert.throws(()=>c.comparar({ids:['FILME-001','FILME-001']}));
});
test('sessão encontra combinação exata, conta intervalos e não duplica filmes', () => {
  const fixture=validarCatalogo([60,70,80,90].map((duracao,i)=>({...filmes[i],duracao_minutos:duracao,disponivel:true})));
  const consultas=criarConsultas(fixture);
  const r=consultas.planejarSessao({tempo_disponivel:150,intervalo_minutos:10,quantidade_filmes:2,limite:5});
  assert.equal(r.total_combinacoes,2); // 60+70+10 e 60+80+10
  assert.equal(r.sessoes[0].tempo_restante,0);
  assert.equal(r.sessoes[0].duracao_total,150);
  for(const s of r.sessoes) assert.equal(new Set(s.filmes.map(f=>f.id)).size,2);
  assert.equal(consultas.planejarSessao({tempo_disponivel:59,quantidade_filmes:1}).total_combinacoes,0);
  assert.equal(consultas.planejarSessao({tempo_disponivel:60,quantidade_filmes:1,intervalo_minutos:60}).sessoes[0].duracao_intervalos,0);
  assert.equal(consultas.planejarSessao({tempo_disponivel:230,quantidade_filmes:3,intervalo_minutos:10}).sessoes[0].duracao_total,230);
  assert.throws(()=>consultas.planejarSessao({tempo_disponivel:300,filtros:{somente_disponiveis:false}}));
});
test('sessão filtra candidatos antes de combinar, sem depender de paginação', () => {
  const r=c.planejarSessao({tempo_disponivel:180,quantidade_filmes:2,intervalo_minutos:10,filtros:{clima:'leve',idade_publico:10},limite:5});
  assert.ok(r.total_combinacoes>0);
  for(const s of r.sessoes) {
    assert.ok(s.duracao_total<=180);
    assert.equal(s.duracao_total,s.filmes.reduce((n,f)=>n+f.duracao_minutos,0)+10);
    assert.ok(s.filmes.every(f=>f.disponivel && f.idade_minima_sugerida<=10 && f.climas.includes('leve')));
  }
});
test('estatísticas globais, grupos sobrepostos e resultado vazio', () => {
  const r=c.resumir();
  assert.equal(r.total,60); assert.equal(r.disponiveis,48); assert.equal(r.indisponiveis,12);
  assert.ok(r.grupos.reduce((n,g)=>n+g.quantidade,0)>60);
  const animacoes=filmes.filter(f=>f.generos.includes('animação'));
  const a=c.resumir({filtros:{genero:'animação'}});
  assert.equal(a.total,6);
  assert.equal(a.duracao_media_minutos,Math.round(animacoes.reduce((n,f)=>n+f.duracao_minutos,0)/6*100)/100);
  assert.equal(c.resumir({filtros:{somente_disponiveis:true}}).total,48);
  const vazio=c.resumir({filtros:{duracao_maxima:1}});
  assert.equal(vazio.total,0); assert.equal(vazio.duracao_media_minutos,null); assert.deepEqual(vazio.grupos,[]);
});
test('alternativas limitam aumento e preservam idade, exclusões e disponibilidade', () => {
  const r=c.sugerirAlternativas({filtros:{genero:'comédia',duracao_maxima:70,idade_publico:0,excluir_conteudos:['cenas de tensão'],excluir_generos:['suspense']},acrescimo_maximo_minutos:20,limite:5});
  assert.equal(r.total_exatos,0);
  assert.deepEqual(r.alternativas.map(a=>a.filme.id),['FILME-004','FILME-002']);
  for(const a of r.alternativas) {
    assert.ok(a.filme.disponivel && a.filme.idade_minima_sugerida===0);
    assert.ok(a.mudancas.every(m=>m.campo==='duracao_maxima' && m.acrescimo_minutos<=20));
  }
  const protegidos=c.sugerirAlternativas({filtros:{genero:'suspense',idade_publico:0,excluir_generos:['animação'],excluir_conteudos:['cenas de tensão']},flexibilizar:['generos'],limite:5});
  assert.ok(protegidos.alternativas.length>0);
  for(const a of protegidos.alternativas) {
    assert.ok(a.filme.idade_minima_sugerida===0 && a.filme.disponivel && !a.filme.generos.includes('animação'));
    assert.ok(a.mudancas.some(m=>m.campo==='genero'));
  }
  const impossivel=c.sugerirAlternativas({filtros:{genero:'suspense',idade_publico:0,duracao_maxima:1},flexibilizar:['duracao_maxima'],acrescimo_maximo_minutos:60});
  assert.equal(impossivel.total_alternativas,0);
});
test('alternativas não flexibilizam quando há correspondências exatas', () => {
  const r=c.sugerirAlternativas({filtros:{genero:'comédia'}});
  assert.ok(r.total_exatos>0); assert.deepEqual(r.alternativas,[]);
  assert.throws(()=>c.sugerirAlternativas({filtros:{},flexibilizar:['idade_publico']}));
});
