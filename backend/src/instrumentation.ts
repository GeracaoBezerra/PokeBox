import { register } from 'node:module';

import { getNodeAutoInstrumentations } from '@opentelemetry/auto-instrumentations-node';
import { ExpressLayerType } from '@opentelemetry/instrumentation-express';
import { OTLPTraceExporter } from '@opentelemetry/exporter-trace-otlp-http';
import { NodeSDK } from '@opentelemetry/sdk-node';
import { PrismaInstrumentation } from '@prisma/instrumentation';

import './config/env.js';

if (process.env.OTEL_EXPORTER_OTLP_ENDPOINT) {
  register('@opentelemetry/instrumentation/hook.mjs', import.meta.url);

  const sdk = new NodeSDK({
    serviceName: process.env.OTEL_SERVICE_NAME ?? 'pokebox-backend',
    traceExporter: new OTLPTraceExporter(),
    instrumentations: [
      getNodeAutoInstrumentations({
        '@opentelemetry/instrumentation-fs': { enabled: false },
        '@opentelemetry/instrumentation-dns': { enabled: false },
        '@opentelemetry/instrumentation-net': { enabled: false },
        '@opentelemetry/instrumentation-router': { enabled: false },
        '@opentelemetry/instrumentation-http': {
          ignoreIncomingRequestHook: (req) => req.url?.startsWith('/health') ?? false,
        },
        '@opentelemetry/instrumentation-express': { ignoreLayersType: [ExpressLayerType.MIDDLEWARE] },
      }),
      new PrismaInstrumentation(),
    ],
  });

  sdk.start();

  const stop = () => {
    sdk.shutdown().catch(() => undefined);
  };
  process.once('SIGTERM', stop);
  process.once('SIGINT', stop);
}
