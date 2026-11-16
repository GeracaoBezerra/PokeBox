import { register } from 'node:module';

import { getNodeAutoInstrumentations } from '@opentelemetry/auto-instrumentations-node';
import { OTLPTraceExporter } from '@opentelemetry/exporter-trace-otlp-proto';
import { ExpressLayerType } from '@opentelemetry/instrumentation-express';
import { NodeSDK } from '@opentelemetry/sdk-node';
import { PrismaInstrumentation } from '@prisma/instrumentation';

import './config/env.js';

let sdk: NodeSDK | undefined;

if (process.env.OTEL_EXPORTER_OTLP_ENDPOINT) {
  register('@opentelemetry/instrumentation/hook.mjs', import.meta.url);

  sdk = new NodeSDK({
    serviceName: process.env.OTEL_SERVICE_NAME || 'pokebox-backend',
    traceExporter: new OTLPTraceExporter(),
    instrumentations: [
      getNodeAutoInstrumentations({
        '@opentelemetry/instrumentation-fs': { enabled: false },
        '@opentelemetry/instrumentation-dns': { enabled: false },
        '@opentelemetry/instrumentation-net': { enabled: false },
        '@opentelemetry/instrumentation-router': { enabled: false },
        '@opentelemetry/instrumentation-http': {
          ignoreIncomingRequestHook: (req) => req.method === 'OPTIONS' || (req.url?.startsWith('/health') ?? false),
        },
        '@opentelemetry/instrumentation-express': {
          ignoreLayersType: [ExpressLayerType.MIDDLEWARE, ExpressLayerType.ROUTER],
        },
      }),
      new PrismaInstrumentation(),
    ],
  });

  sdk.start();
}

const SHUTDOWN_LIMIT_MS = 3000;

export async function shutdownTracing(): Promise<void> {
  if (!sdk) return;
  const limit = new Promise<void>((resolve) => setTimeout(resolve, SHUTDOWN_LIMIT_MS).unref());
  await Promise.race([sdk.shutdown().catch(() => undefined), limit]);
}
