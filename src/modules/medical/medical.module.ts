import { Module } from "@nestjs/common";
import { MedicalsController } from "./medical.controller";
import { MedicalsService } from "./medical.service";

@Module({
    controllers:[MedicalsController],
    providers:[MedicalsService],
    exports:[MedicalsService]
})
export class MedicalsModule {}