import test from 'node:test';
import assert from 'node:assert/strict';
import { scanCompliance, BANNED_PATTERNS } from '../../src/complianceScanner.js';

test('Compliance Scanner: flags prohibited absolute cure claims', () => {
  const dangerousCopy = 'Try this new substitute medicine! It is a 100% cure for diabetes!';
  const result = scanCompliance(dangerousCopy);

  assert.equal(result.isCompliant, false);
  assert.equal(result.hasCritical, true);
  const flag = result.flags.find(f => f.code === 'PROHIBITED_CURE_CLAIM');
  assert.ok(flag, 'Should catch PROHIBITED_CURE_CLAIM');
  assert.equal(flag.severity, 'CRITICAL');
});

test('Compliance Scanner: flags illegal prescription tampering advice', () => {
  const badAdvice = 'Save money today! Stop your pills and switch medicines yourself without consulting anyone.';
  const result = scanCompliance(badAdvice);

  assert.equal(result.isCompliant, false);
  assert.equal(result.hasCritical, true);
  const flag = result.flags.find(f => f.code === 'PRESCRIPTION_TAMPERING_ADVICE');
  assert.ok(flag, 'Should catch PRESCRIPTION_TAMPERING_ADVICE');
});

test('Compliance Scanner: flags missing clinician consultation CTA', () => {
  const educationalCopy = 'Understanding Metformin substitutes: Metformin has the exact same therapeutic molecule across brands.';
  const result = scanCompliance(educationalCopy);

  const ctaFlag = result.flags.find(f => f.code === 'MISSING_CLINICIAN_CTA');
  assert.ok(ctaFlag, 'Should require clinician consultation CTA for public patient education');
});

test('Compliance Scanner: approves compliant copy with clinician consultation and proper brand terminology', () => {
  const compliantCopy = `
    Understanding chronic care substitutes:
    At Akidha, every substitute medicine is verified for WHO-GMP manufacturing quality and regulatory approval.
    You get the exact same active molecule prescribed for your blood pressure management.
    Always consult your doctor or pharmacist before making any changes to your chronic care routine.
  `;
  const result = scanCompliance(compliantCopy);

  assert.equal(result.hasCritical, false);
  assert.ok(result.score >= 80, `Expected high compliance score, got ${result.score}`);
});

test('Compliance Scanner: flags discouraged terminology "cheap generics"', () => {
  const copyWithCheapGenerics = `
    Why pay more? Buy cheap generics today.
    Always discuss with your doctor before changing prescriptions.
  `;
  const result = scanCompliance(copyWithCheapGenerics);

  const termFlag = result.flags.find(f => f.code === 'DISCOURAGED_TERMINOLOGY');
  assert.ok(termFlag, 'Should flag discouraged terminology');
  assert.equal(termFlag.severity, 'INFO');
});

