import { Module } from "@nestjs/common";
import { ZaiController } from "./zai.contoller";
import { ZaiService } from "./zai.service";

@Module({
    controllers:[ZaiController],
    providers:[ZaiService],
    exports:[ZaiService]
})
export class ZaiModule{}