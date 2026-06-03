import { Expose } from 'class-transformer';
import { JsonMapperService } from './json-mapper.service';

class Sample {
  @Expose()
  id!: string;

  @Expose()
  count!: number;
}

describe('JsonMapperService', () => {
  let service: JsonMapperService;

  beforeEach(() => {
    service = new JsonMapperService();
  });

  it('should deserialize a plain object into a class instance', () => {
    const result = service.deserialize(Sample, { id: 'a1', count: 3 });

    expect(result).toBeInstanceOf(Sample);
    expect(result.id).toBe('a1');
    expect(result.count).toBe(3);
  });

  it('should deserialize an array of plain objects into class instances', () => {
    const result = service.deserializeArray(Sample, [
      { id: 'a1', count: 1 },
      { id: 'a2', count: 2 },
    ]);

    expect(result).toHaveLength(2);
    expect(result[0]).toBeInstanceOf(Sample);
    expect(result[1].id).toBe('a2');
  });

  it('should serialize a class instance into a plain object', () => {
    const instance = service.deserialize(Sample, { id: 'a1', count: 3 });

    const plain = service.serialize(instance);

    expect(plain).toEqual({ id: 'a1', count: 3 });
    expect(plain).not.toBeInstanceOf(Sample);
  });
});
