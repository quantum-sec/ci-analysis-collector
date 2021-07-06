import { TemplateExample } from './template-example';

describe('TemplateExample', () => {

  let example: TemplateExample;

  beforeEach(() => {
    example = new TemplateExample();
  });

  it('should return a hello world response', () => {
    const result = example.run();
    expect(result).toEqual('Hello World!');
  });
});
