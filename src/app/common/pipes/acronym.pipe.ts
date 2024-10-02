import {Pipe, PipeTransform} from '@angular/core';

/**
 * Takes the first character from each word returns that string
 */
@Pipe({ name: 'rlAcronym' })
export class AcronymPipe implements PipeTransform {
    transform(value: string | undefined): any {
        return value?.split(' ')
            .map((word) => word.charAt(0))
            .join('');
    }
}