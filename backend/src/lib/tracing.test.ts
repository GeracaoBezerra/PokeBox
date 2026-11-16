import { context, SpanStatusCode, trace } from '@opentelemetry/api';
import { AsyncLocalStorageContextManager } from '@opentelemetry/context-async-hooks';
import { InMemorySpanExporter, SimpleSpanProcessor, TracerProvider } from '@opentelemetry/sdk-trace';

import { withSpan } from './tracing.js';

const exporter = new InMemorySpanExporter();

beforeAll(() => {
  context.setGlobalContextManager(new AsyncLocalStorageContextManager().enable());
  trace.setGlobalTracerProvider(new TracerProvider({ spanProcessors: [new SimpleSpanProcessor({ exporter })] }));
});

afterAll(() => {
  trace.disable();
  context.disable();
});

beforeEach(() => exporter.reset());

describe('withSpan', () => {
  test('devolve o resultado e fecha o span com nome e atributos', async () => {
    await expect(withSpan('trade.accept', { 'trade.id': 't1' }, async () => 42)).resolves.toBe(42);

    const [span] = exporter.getFinishedSpans();
    expect(span.name).toBe('trade.accept');
    expect(span.attributes).toEqual({ 'trade.id': 't1' });
    expect(span.status.code).toBe(SpanStatusCode.UNSET);
  });

  test('erro sobe igual e o span fica marcado com erro e com a exceção', async () => {
    const boom = new Error('estoque mudou');

    await expect(withSpan('trade.accept', {}, async () => Promise.reject(boom))).rejects.toBe(boom);

    const [span] = exporter.getFinishedSpans();
    expect(span.status).toEqual({ code: SpanStatusCode.ERROR, message: 'estoque mudou' });
    expect(span.events.map((event: { name: string }) => event.name)).toEqual(['exception']);
  });

  test('erro que não é Error também marca o span', async () => {
    await expect(withSpan('trade.accept', {}, async () => Promise.reject('sem estoque'))).rejects.toBe('sem estoque');

    expect(exporter.getFinishedSpans()[0].status).toEqual({ code: SpanStatusCode.ERROR, message: 'sem estoque' });
  });

  test('o que roda dentro vê o span como ativo', async () => {
    let inside: string | undefined;

    await withSpan('trade.accept', {}, async () => {
      inside = trace.getActiveSpan()?.spanContext().spanId;
    });

    expect(inside).toBe(exporter.getFinishedSpans()[0].spanContext().spanId);
  });
});
