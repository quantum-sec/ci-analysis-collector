import { IResult } from './result.interface';

export type ResultsParserDelegate = (results: string) => IResult[];
