import { Injectable } from '@angular/core';

@Injectable({
  providedIn: 'root'
})
export class FastaFileService {

  constructor() { }

  parseFastaToJson(text: string): { [key: string]: { nucleotides: string } } {
    const json = {};
    const textSplit = text.split('\n')
    let actualSequence = '';
    textSplit.forEach(element => {
      if (element.startsWith('>')) {
        actualSequence = element.substring(1)
        json[actualSequence] = { nucleotides: '' }
      } else if (actualSequence && actualSequence !== '') {
        json[actualSequence].nucleotides = `${json[actualSequence].nucleotides}${element}`
      }
    });
    return json;
  }
}
