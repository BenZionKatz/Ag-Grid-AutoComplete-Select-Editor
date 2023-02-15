import { OnInit, TemplateRef } from "@angular/core";
import { BtTIControlsSetDesign } from "src/app/ng-buyton/CDK-components/shared/interfaces/controls/BtTIControlsSet";
import { BtTOption } from "./BtTOption";

export type BtTTemplateTypes = 'html'|'controls-set'|'ang-tmpl'|'ang-comp';

export type BtTTemplate = string | BtTIControlsSetDesign<any> |TemplateRef<null> |OnInit;

export interface BtAutocompleteCustomTmpl {
  templateType:BtTTemplateTypes,
  template:BtTTemplate | ((option:BtTOption) => BtTTemplate),
  filterFunction?:(predict)=>{}
}