export type DataLakeRecord = {
  source: 'flows' | 'transcripts' | 'runtime' | 'qa' | 'workforce' | 'journeys';
  id: string;
  payload: Record<string, unknown>;
  timestamp: string;
};

export type DataLakeState = {
  records: DataLakeRecord[];
};

export function ingestData(state: DataLakeState, incoming: DataLakeRecord[]): DataLakeState {
  const merged = [...state.records, ...incoming];
  return { records: merged };
}

export function getSchema() {
  return {
    entities: [
      { name: 'records', fields: ['source', 'id', 'payload', 'timestamp'] },
      { name: 'sources', values: ['flows', 'transcripts', 'runtime', 'qa', 'workforce', 'journeys'] },
    ],
    lineage: ['ingest -> query -> aggregate -> export'],
  };
}

export function queryData(state: DataLakeState, query: { source?: string; containsText?: string; limit?: number }) {
  let records = state.records;
  if (query.source) records = records.filter((r) => r.source === query.source);
  if (query.containsText) {
    const needle = query.containsText.toLowerCase();
    records = records.filter((r) => JSON.stringify(r.payload).toLowerCase().includes(needle));
  }
  return records.slice(0, query.limit ?? 100);
}

export function aggregate(state: DataLakeState) {
  const bySource = state.records.reduce<Record<string, number>>((acc, r) => {
    acc[r.source] = (acc[r.source] ?? 0) + 1;
    return acc;
  }, {});
  return {
    totalRecords: state.records.length,
    bySource,
  };
}

export function exportResults(state: DataLakeState, query: { source?: string; containsText?: string; limit?: number }) {
  const rows = queryData(state, query);
  return {
    query,
    rows,
    aggregates: aggregate({ records: rows }),
    exportedAt: new Date().toISOString(),
  };
}

