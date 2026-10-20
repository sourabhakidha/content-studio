import test from 'node:test';
import assert from 'node:assert/strict';
import { scoreSignal, deduplicateSignals, convertSignalToBrief } from '../../src/signalPrioritizer.js';

test('Signal Prioritizer: assigns high scores to chronic care, substitute, and price control signals', () => {
  const signal = {
    title: 'NPPA caps prices of essential diabetes and hypertension medicine substitutes in India',
    summary: 'Government regulatory notification enforces price caps on Metformin and Telmisartan.',
    category: 'regulation'
  };

  const score = scoreSignal(signal);
  assert.ok(score >= 60, `Expected high score >= 60, got ${score}`);
});

test('Signal Prioritizer: deprioritizes irrelevant wellness noise', () => {
  const noiseSignal = {
    title: 'Miracle ayurvedic hair oil discount sale',
    summary: 'Buy 1 get 1 free hair growth oil',
    category: 'industry'
  };

  const score = scoreSignal(noiseSignal);
  assert.ok(score <= 25, `Expected low score <= 25, got ${score}`);
});

test('Signal Prioritizer: removes duplicates by URL and normalized title', () => {
  const rawList = [
    { title: 'Understanding Substitutes', url: 'https://example.com/news/1', summary: 'Article 1' },
    { title: 'Understanding Substitutes!', url: 'https://example.com/news/1', summary: 'Duplicate 1' },
    { title: 'Understanding Substitutes', url: 'https://example.com/news/2', summary: 'Duplicate 2' },
    { title: 'New CDSCO Regulation', url: 'https://example.com/news/3', summary: 'Article 3' }
  ];

  const deduped = deduplicateSignals(rawList);
  assert.equal(deduped.length, 2);
  assert.equal(deduped[0].url, 'https://example.com/news/1');
  assert.equal(deduped[1].url, 'https://example.com/news/3');
});

test('Signal Prioritizer: converts signal to a compliant educational creative brief and task proposal', () => {
  const signal = {
    title: 'Why do substitute medicines cost 70% less?',
    summary: 'Patients express confusion over why brand names cost more than WHO-GMP generic substitutes.',
    source: 'Reddit r/india',
    url: 'https://reddit.com/r/india/comments/abc123',
    category: 'pricing',
    relevance_score: 85
  };

  const brief = convertSignalToBrief(signal);
  assert.ok(brief.task_title.includes('Why do substitute medicines cost 70% less?'));
  assert.equal(brief.priority, 'High');
  assert.equal(brief.theme, 'Affordability & Fair Pricing');
  assert.ok(brief.brief.includes('Teach first, sell second'));
  assert.ok(brief.brief.includes('doctor/pharmacist consultation CTA'));
});

