import { appendFile, readFile } from 'node:fs/promises';

const summary = JSON.parse(await readFile(new URL('../coverage/coverage-summary.json', import.meta.url), 'utf8'));
const config = (await import('../jest.coverage.config.js')).default;
const minimum = config.coverageThreshold.global;

const metrics = [
  ['Linhas', 'lines'],
  ['Comandos', 'statements'],
  ['Funções', 'functions'],
  ['Ramos (if/else)', 'branches'],
];

const rows = metrics.map(([label, key]) => {
  const { pct, covered, total } = summary.total[key];
  const status = pct >= minimum[key] ? '✅' : '❌';
  return `| ${label} | ${pct.toFixed(2)}% | ${covered}/${total} | ${minimum[key]}% | ${status} |`;
});

const markdown = [
  '## Cobertura do backend (unidade + integração)',
  '',
  '| Métrica | Cobertura | Cobertos | Mínimo | |',
  '|---|---|---|---|---|',
  ...rows,
  '',
  'Relatório completo, arquivo por arquivo: artefato `coverage-backend` desta execução (abrir `lcov-report/index.html`).',
  '',
].join('\n');

const target = process.env.GITHUB_STEP_SUMMARY;
if (target) {
  await appendFile(target, markdown);
} else {
  console.log(markdown);
}
