import { values } from './wikidata.mjs';
// Taxonomia da aplicação: cada associação é derivada de um gênero explícito (P136).
// Rótulos originais ficam preservados em generos_originais; não inferimos temas pelo enredo.
const mapa = {
  Q157443:['comédia'], Q130232:['drama'], Q188473:['ação'], Q319221:['aventura'], Q471839:['ficção científica'],
  Q157394:['fantasia'], Q2484376:['suspense'], Q11304653:['suspense'], Q1200678:['mistério'], Q1054574:['romance'],
  Q200092:['terror'], Q1361932:['família'], Q842256:['musical'], Q369747:['guerra'], Q959790:['crime'],
  Q645928:['biografia'], Q17013749:['histórico'], Q2678111:['comédia','ação'], Q859369:['comédia','drama'],
  Q1637212:['comédia','fantasia'], Q761469:['comédia','ficção científica'], Q118612349:['comédia','romance'],
  Q10663882:['terror','ficção científica'], Q20656232:['ação','ficção científica'], Q4686573:['aventura','ficção científica'],
  Q19367312:['crime','suspense'], Q113485322:['crime','drama'], Q3990883:['ação','suspense'],
  Q109733304:['suspense'], Q590103:['suspense'], Q109629396:['terror'], Q109626272:['terror'],
  Q63214877:['drama'], Q116514801:['histórico','drama'], Q7168625:['histórico','drama'], Q116456802:['guerra','drama'],
  Q1788980:['crime','comédia'], Q95952108:['comédia'], Q5778924:['comédia'], Q53094:['comédia'],
  Q930383:['fantasia','romance'], Q468478:['ficção científica'], Q108084492:['ficção científica'],
  Q725757:['ficção científica'], Q904447:['ficção científica'], Q66914288:['aventura'],
  Q4774498:['guerra'], Q25533274:['mistério'], Q109733630:['crime'], Q192881:['comédia','drama'],
  Q111278985:['esporte'], Q78528852:['faroeste'], Q775169:['faroeste'], Q15637299:['drama'], Q15637301:['fantasia']
};
export function normalizarGeneros(e, originais) {
  const resultado = values(e,'P136').flatMap(v => mapa[v.id] || []);
  // A natureza de animação é um tipo da obra (P31), não necessariamente um gênero P136.
  if(values(e,'P31').some(v => ['Q202866','Q20650540','Q29168811'].includes(v.id)) || values(e,'P136').some(v => v.id === 'Q25110269')) resultado.push('animação');
  return [...new Set(resultado.length ? resultado : originais)];
}
