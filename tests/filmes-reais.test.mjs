import { test } from 'node:test';
import assert from 'node:assert/strict';
import { carregarCatalogo, criarConsultas, validarCatalogo } from '../src/catalogo.mjs';
import { normalizarGeneros } from '../scripts/lib/generos.mjs';
import { avaliacaoWikidata, duracaoWikidata, imagemCommons, dataWikidata } from '../scripts/lib/wikidata.mjs';
const filmes = carregarCatalogo();
const reais = filmes.filter(f => f.tipo === 'real');
const c = criarConsultas(filmes);
const origem = reais.find(f => f.id === 'REAL-Q25188');

test('100 filmes reais com proveniência, IDs estáveis e 60 fictícios preservados', () => {
  assert.equal(filmes.length, 160); assert.equal(reais.length, 100);
  assert.equal(c.buscar({catalogo:'reais',somente_disponiveis:false}).total,100);
  assert.equal(c.buscar({catalogo:'ficticios',somente_disponiveis:false}).total,60);
  assert.equal(new Set(reais.map(f=>f.identificadores.wikidata)).size,100);
  for(const f of reais) {
    assert.equal(f.id,`REAL-${f.identificadores.wikidata}`);
    assert.equal(f.fonte.licenca_dados,'CC0-1.0');
    assert.ok(f.fonte.revisao>0 && !Number.isNaN(Date.parse(f.fonte.consultado_em)));
    assert.ok(f.diretores.length>0); assert.ok(f.elenco.length>0);
    assert.equal(f.idade_minima_sugerida,null);
    assert.equal(f.avisos_conteudo,null);
    if(f.imagem) { assert.match(f.imagem.url,/^https:\/\/(upload|thumb)\.wikimedia\.org\//); assert.ok(f.imagem.licenca); }
    if(f.poster_url) { assert.equal(f.imagem.tipo,'poster'); assert.equal(f.poster_url,f.imagem.url); }
  }
  assert.ok(reais.some(f=>f.paises.includes('Brasil')));
  assert.ok(reais.some(f=>f.avaliacao)); assert.ok(reais.some(f=>f.imagem));
  assert.throws(()=>validarCatalogo([{...origem,fonte:null}]));
});

test('busca por elenco, diretor e título original ignora acentos e caixa', () => {
  const r=c.buscar({catalogo:'reais',ator:'DICAPRIO',titulo:'Inception',diretor:'nolan'});
  assert.equal(r.total,1); assert.equal(r.filmes[0].id,origem.id);
  assert.equal(c.buscar({catalogo:'ficticios',ator:'DiCaprio'}).total,0);
  const d=c.obterDetalhes({id:origem.id}).filme;
  assert.ok(d.elenco.some(a=>a.nome.includes('DiCaprio')));
  assert.ok(d.diretores.includes('Christopher Nolan'));
  assert.equal(d.duracao_minutos,148);
});

test('valores desconhecidos não passam em filtros etários, conteúdo, duração ou votos', () => {
  const desconhecido={...origem,duracao_minutos:null,ano:null,avaliacao:null,generos:[]};
  const x=criarConsultas(validarCatalogo([desconhecido]));
  for(const filtros of [{idade_publico:18},{excluir_conteudos:['cenas de tensão']},{duracao_maxima:200},{duracao_minima:1},{ano_maximo:2026},{nota_minima:0},{votos_minimos:0},{audio:'português'},{legenda:'português'},{excluir_generos:['terror']}]) {
    assert.equal(x.buscar(filtros).total,0,JSON.stringify(filtros));
  }
  assert.equal(x.planejarSessao({tempo_disponivel:300,quantidade_filmes:1}).total_combinacoes,0);
  assert.equal(x.planejarSessao({tempo_disponivel:300,quantidade_filmes:1}).excluidos_sem_duracao,1);
  const stats=x.resumir(); assert.equal(stats.duracao_media_minutos,null); assert.equal(stats.sem_duracao,1);
  const comp=criarConsultas(validarCatalogo([desconhecido,filmes[0]])).comparar({ids:[origem.id,filmes[0].id]});
  assert.equal(comp.diferenca_duracao_minutos,null);
});

test('coproduções e filmes com vários diretores/idiomas são encontrados por qualquer integrante', () => {
  const f=validarCatalogo([{...origem,paises:['Brasil','França'],diretores:['Ana','João'],idiomas_originais:['português','francês']}]);
  const x=criarConsultas(f);
  assert.equal(x.buscar({pais:'franca',diretor:'joao',idioma_original:'FRANCES'}).total,1);
  assert.deepEqual(x.resumir({agrupar_por:'pais'}).grupos.map(g=>g.valor),['Brasil','França']);
});

test('nota e votos filtram a mesma avaliação; ausentes ficam no fim nas duas ordens', () => {
  const rated=reais.find(f=>f.avaliacao?.votos>0);
  const unknown=validarCatalogo([{...filmes[0],avaliacao:null}])[0];
  const x=criarConsultas([unknown,rated]);
  for(const ordem of ['asc','desc']) assert.equal(x.buscar({ordenar_por:'nota',ordem}).filmes[0].id,rated.id);
  assert.equal(x.buscar({votos_minimos:rated.avaliacao.votos,nota_minima:rated.avaliacao.nota}).total,1);
  assert.equal(x.buscar({votos_minimos:rated.avaliacao.votos+1}).total,0);
  assert.throws(()=>x.buscar({nota_minima:11}));
  assert.ok(c.buscar({catalogo:'reais',com_imagem:true}).filmes.every(f=>f.imagem));
  assert.ok(c.buscar({catalogo:'reais',com_poster:true}).filmes.every(f=>f.poster_url && f.imagem.tipo==='poster'));
});

test('sessões contam todas as combinações mantendo só o limite; alternativas preservam catálogo e ator', () => {
  const r=c.planejarSessao({tempo_disponivel:2000,quantidade_filmes:3,filtros:{catalogo:'reais'},limite:2});
  const n=reais.filter(f=>f.disponivel&&f.duracao_minutos!==null).length;
  assert.equal(r.total_combinacoes,n*(n-1)*(n-2)/6);
  assert.equal(r.sessoes.length,2);
  assert.ok(r.sessoes.every(s=>s.filmes.every(f=>f.tipo==='real')&&s.duracao_total<=2000));
  const a=c.sugerirAlternativas({filtros:{catalogo:'reais',titulo:'Inception',ator:'DiCaprio',duracao_maxima:140},acrescimo_maximo_minutos:10});
  assert.equal(a.alternativas.length,1); assert.equal(a.alternativas[0].filme.id,origem.id);
  assert.deepEqual(a.alternativas[0].mudancas,[{campo:'duracao_maxima',de:140,para:148,acrescimo_minutos:8}]);
  const semClassificacao=c.sugerirAlternativas({filtros:{catalogo:'reais',idade_publico:10,duracao_maxima:10}});
  assert.equal(semClassificacao.total_alternativas,0);
});

const snak = value => ({snaktype:'value',datavalue:{value}});
const score = (value,fonte,data,votos) => ({id:'Q1$rating',rank:'normal',mainsnak:snak(value),qualifiers:{P447:[snak({id:fonte})],P585:[snak({time:`+${data}T00:00:00Z`,precision:11})],P7887:[snak({amount:String(votos)})]}});
test('importador não mistura fontes, escalas, notas antigas ou unidades de duração', () => {
  const e={id:'Q1',claims:{P444:[score('90%','Q105584','2026-01-01',100),score('7.1/10','Q37312','2020-01-01',20),score('8,2/10','Q37312','2022-01-01',50)]}};
  assert.equal(avaliacaoWikidata(e).nota,8.2); assert.equal(avaliacaoWikidata(e).data_avaliacao,'2022-01-01');
  assert.equal(avaliacaoWikidata({id:'Q1',claims:{P444:[score('90%','Q105584','2026-01-01',100)]}}),null);
  assert.equal(dataWikidata({time:'+2020-00-00T00:00:00Z',precision:9}),'2020');
  assert.equal(duracaoWikidata({claims:{P2047:[{id:'x',mainsnak:snak({amount:'+2',unit:'hour'})}]}}),null);
  assert.equal(duracaoWikidata({claims:{P2047:[{id:'x',mainsnak:snak({amount:'+120',unit:'http://www.wikidata.org/entity/Q7727'})}]}}).minutos,120);
});

test('importador só retorna imagem com licença explícita e preserva tipo', () => {
  const info={url:'https://upload.wikimedia.org/example.jpg',descriptionurl:'https://commons.wikimedia.org/wiki/File:Example.jpg',extmetadata:{}};
  assert.equal(imagemCommons(info,'poster'),null);
  info.extmetadata={LicenseShortName:{value:'CC BY-SA 4.0'},Artist:{value:'<a>Autora</a>'},LicenseUrl:{value:'https://creativecommons.org/licenses/by-sa/4.0/'}};
  const image=imagemCommons(info,'imagem_relacionada');
  assert.equal(image.tipo,'imagem_relacionada'); assert.equal(image.autor,'Autora');
  assert.equal(imagemCommons({...info,url:'https://unverified.example/image'},'poster'),null);
});

test('gêneros distinguem animação e anime sem inferir faixa etária', () => {
  for(const id of ['Q202866','Q20650540','Q29168811']) {
    assert.deepEqual(normalizarGeneros({claims:{P31:[{mainsnak:snak({id})}]}},[]),['animação']);
  }
  assert.ok(c.buscar({catalogo:'reais',genero:'animação',titulo:'Chihiro'}).total>0);
  assert.equal(c.buscar({catalogo:'reais',genero:'animação',idade_publico:10}).total,0);
});
