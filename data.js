// Paper Table 1. All values are percentages; SCOPE uses training step 150.
// Metric order: ALFWorld Pick, Look, Clean, Heat, Cool, Pick2, Avg;
//               WebShop normalized task Score, Success.
(() => {
  const metricKeys = ['pick', 'look', 'clean', 'heat', 'cool', 'pick2', 'avg', 'score', 'success'];
  const row = (method, type, values) => ({
    method, type,
    metrics: Object.fromEntries(metricKeys.map((key, index) => [key, values[index]])),
  });
  window.SCOPE_METRICS = metricKeys;
  window.SCOPE_RESULTS = [
    { id: 'qwen25-3b', label: 'Qwen2.5-3B', fullName: 'Qwen2.5-3B-Instruct', rows: [
      row('Vanilla',       'none',     [44.4, 11.1,   6.2,  15.4, 28.6,  12.5, 21.9,  6.7,  0.8]),
      row('Skill-Prompt*', 'skillBank',[51.7, 66.7,  48.4,   0.0,  4.3,  10.0, 28.9,  0.2,  0.8]),
      row('GRPO',          'none',     [91.2, 62.5,  96.2,  61.9, 65.0,  47.4, 75.0, 79.8, 63.3]),
      row('AgentOPSD',     'skillBank',[100.0,68.8,  86.4,  66.7, 84.6,  73.7, 84.4, 90.4, 69.5]),
      row('SDAR',          'skillBank',[97.1, 62.5, 100.0,  61.9, 75.0,  84.2, 84.4, 85.0, 68.0]),
      row('OPID',          'hybrid',   [92.7,100.0,  88.9,  70.0, 84.2,  70.0, 84.3, 85.0, 74.2]),
      row('GRSD',          'trajectory',[100.0,81.3, 91.3,  88.2, 70.8,  85.7, 86.7, 86.9, 76.5]),
      row('SEED',          'trajectory',[100.0,100.0,100.0,100.0,70.6, 80.0, 91.8, 88.5, 78.9]),
      row('SCOPE',         'step',     [100.0,100.0,100.0,100.0,85.7,100.0, 97.7, 87.9, 85.2]),
    ] },
    { id: 'qwen25-7b', label: 'Qwen2.5-7B', fullName: 'Qwen2.5-7B-Instruct', rows: [
      row('Vanilla',       'none',     [36.1, 22.2,   3.1,   0.0,  0.0,   0.0, 12.5,  5.9,  1.6]),
      row('Skill-Prompt*', 'skillBank',[51.7, 50.0,  32.3,   5.3,  4.3,   0.0, 23.4,  1.7,  0.8]),
      row('GRPO',          'none',     [91.2, 87.5,  96.2,  81.0, 65.0,  57.9, 81.2, 80.9, 72.6]),
      row('AgentOPSD',     'skillBank',[91.2, 87.5, 100.0,  90.5, 75.0,  84.2, 89.1, 90.2, 79.7]),
      row('SDAR',          'skillBank',[94.7, 75.0, 100.0,  86.7, 68.2,  78.9, 85.9, 89.4, 82.8]),
      row('OPID',          'hybrid',   [100.0,81.8,  97.1, 100.0, 80.8,  80.0, 90.0, 85.3, 79.7]),
      row('GRSD',          'trajectory',[100.0,100.0,100.0, 93.4, 66.7, 82.4, 92.2, 91.6, 82.8]),
      row('SEED',          'trajectory',[100.0,100.0, 96.3, 80.0,100.0,100.0, 96.1, 89.7, 78.1]),
      row('SCOPE',         'step',     [100.0,100.0,100.0,100.0, 95.2, 94.7, 98.4, 89.6, 84.4]),
    ] },
    { id: 'qwen3-17b', label: 'Qwen3-1.7B', fullName: 'Qwen3-1.7B', rows: [
      row('Vanilla',       'none',     [25.0, 22.2,   3.1,   0.0, 21.4,   4.2, 12.5, 46.5,  4.7]),
      row('Skill-Prompt*', 'skillBank',[10.3, 50.0,  16.1,   0.0,  0.0,   5.0,  9.4, 23.0,  2.3]),
      row('GRPO',          'none',     [71.1, 41.7,  36.4,  40.0, 31.8,  31.6, 46.1, 67.3, 38.3]),
      row('AgentOPSD',     'skillBank',[35.5, 50.0,  31.6,  30.0, 46.2,  25.0, 35.9, 66.8, 47.7]),
      row('SDAR',          'skillBank',[73.5, 25.0,  76.9,  33.3, 40.0,  36.8, 53.9, 76.8, 58.6]),
      row('OPID',          'hybrid',   [65.9, 72.7,  66.7,  40.0, 63.2,  45.0, 58.9, 79.6, 64.8]),
      row('GRSD',          'trajectory',[92.5,100.0,100.0,  91.3, 81.3,  88.2, 92.2, 84.5, 66.4]),
      row('SEED',          'trajectory',[97.6,100.0,100.0,  80.0, 84.2,  90.0, 92.0, 87.1, 77.3]),
      row('SCOPE',         'step',     [100.0,100.0, 96.9,100.0, 66.7,  89.5, 92.2, 83.2, 78.9]),
    ] },
  ];
})();
