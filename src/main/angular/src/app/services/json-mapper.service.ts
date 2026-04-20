import {Injectable} from '@angular/core';
import {ClassConstructor, instanceToPlain, plainToInstance} from 'class-transformer';

@Injectable({
  providedIn: 'root',
})
export class JsonMapperService {

  deserialize<T>(cls: ClassConstructor<T>, json: Record<string, unknown>): T {
    return plainToInstance(cls, json);
  }

  deserializeArray<T>(cls: ClassConstructor<T>, json: Record<string, unknown>[]): T[] {
    return plainToInstance(cls, json);
  }

  serialize<T>(instance: T): Record<string, unknown> {
    return instanceToPlain(instance) as Record<string, unknown>;
  }
}
