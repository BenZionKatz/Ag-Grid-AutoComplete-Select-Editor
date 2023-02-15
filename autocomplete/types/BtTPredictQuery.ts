import { BtResponse } from "src/app/ng-buyton/classes/BtResponse";


export type BtTPredictUrlFunc = (predict:string)=> string;
export type BtTPredictQuery = {
    mode:'url'|'observable';
    fetchOn:'init'|'focus'|'over';
    minCharsToFetch?:number;
    url?:string | BtTPredictUrlFunc,
    responseProperty:string,
    observable?:BtResponse
    refetchEveryInput?:boolean
 }