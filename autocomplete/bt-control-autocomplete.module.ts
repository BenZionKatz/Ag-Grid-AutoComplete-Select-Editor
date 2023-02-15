import { NgModule } from '@angular/core';
// import { FormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';
import {BtControlAutoCompleteComponent} from "./bt-control-auto-complete.component"
import {NzAutocompleteModule} from 'ng-zorro-antd/auto-complete';
import {NzIconModule} from 'ng-zorro-antd/icon';

@NgModule({
  declarations: [BtControlAutoCompleteComponent],
  imports: [
    CommonModule,
    NzAutocompleteModule,
    NzIconModule,
    // FormsModule
  ],
  exports:[
    BtControlAutoCompleteComponent,
    ]
})
export class BtControlAutocompleteModule { }
