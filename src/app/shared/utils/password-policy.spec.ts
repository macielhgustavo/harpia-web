import {
  PASSWORD_MAX_LENGTH,
  evaluatePasswordPolicy,
  isPasswordPolicySatisfied,
} from './password-policy';

describe('password policy', () => {
  function requirement(password: string, key: string) {
    return evaluatePasswordPolicy(password).requirements.find(
      (item) => item.key === key,
    );
  }

  it('aceita uma senha que atende a todas as regras', () => {
    const result = evaluatePasswordPolicy('SenhaForte1!');

    expect(result.isValid).toBeTrue();
    expect(result.requirements.every((item) => item.met)).toBeTrue();
    expect(isPasswordPolicySatisfied('SenhaForte1!')).toBeTrue();
  });

  it('aplica os limites de 10 a 128 caracteres', () => {
    expect(requirement('Abcde1!xy', 'length')?.met).toBeFalse();
    expect(requirement('Abcdef1!xy', 'length')?.met).toBeTrue();

    const atMaximum = `Aa1!${'a'.repeat(PASSWORD_MAX_LENGTH - 4)}`;
    const overMaximum = `${atMaximum}a`;

    expect(requirement(atMaximum, 'length')?.met).toBeTrue();
    expect(requirement(overMaximum, 'length')?.met).toBeFalse();
  });

  it('exige letras ASCII maiúscula e minúscula, número e especial', () => {
    const result = evaluatePasswordPolicy('Áá12345678!');

    expect(
      result.requirements.find((item) => item.key === 'uppercase')?.met,
    ).toBeFalse();
    expect(
      result.requirements.find((item) => item.key === 'lowercase')?.met,
    ).toBeFalse();
    expect(
      result.requirements.find((item) => item.key === 'number')?.met,
    ).toBeTrue();
    expect(
      result.requirements.find((item) => item.key === 'special')?.met,
    ).toBeTrue();
  });

  it('rejeita whitespace no início ou no fim', () => {
    expect(
      requirement(' SenhaForte1!', 'surrounding-whitespace')?.met,
    ).toBeFalse();
    expect(
      requirement('SenhaForte1!\t', 'surrounding-whitespace')?.met,
    ).toBeFalse();
    expect(
      requirement('Senha Forte1!', 'surrounding-whitespace')?.met,
    ).toBeTrue();
  });

  it('mede corretamente o limite de 72 bytes em UTF-8', () => {
    const exactly72Bytes = `Aa1!${'a'.repeat(68)}`;
    const over72Bytes = `${exactly72Bytes}á`;

    const accepted = evaluatePasswordPolicy(exactly72Bytes);
    const rejected = evaluatePasswordPolicy(over72Bytes);

    expect(accepted.utf8ByteLength).toBe(72);
    expect(
      accepted.requirements.find((item) => item.key === 'utf8-bytes')?.met,
    ).toBeTrue();
    expect(rejected.utf8ByteLength).toBe(74);
    expect(
      rejected.requirements.find((item) => item.key === 'utf8-bytes')?.met,
    ).toBeFalse();
  });

  it('normaliza e aplica a regra opcional do e-mail sem expô-lo no resultado', () => {
    const result = evaluatePasswordPolicy(
      'Prefixo-USER@EXAMPLE.COM-Aa1!',
      '  User@Example.com  ',
    );
    const withoutKnownEmail = evaluatePasswordPolicy('SenhaForte1!');

    expect(result.requirements.find((item) => item.key === 'email')).toEqual({
      key: 'email',
      label: 'Não contém o e-mail completo da conta',
      met: false,
    });
    expect(JSON.stringify(result)).not.toContain('user@example.com');
    expect(
      withoutKnownEmail.requirements.some((item) => item.key === 'email'),
    ).toBeFalse();
  });
});
