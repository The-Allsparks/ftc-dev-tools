package org.firstinspires.ftc.teamcode.vision;

import com.acmerobotics.dashboard.FtcDashboard;
import com.acmerobotics.dashboard.config.Config;
import com.qualcomm.robotcore.eventloop.opmode.LinearOpMode;
import com.qualcomm.robotcore.eventloop.opmode.TeleOp;
import com.qualcomm.robotcore.hardware.WebcamName;
import org.openftc.easyopencv.OpenCvPipeline;
import org.openftc.easyopencv.OpenCvWebcam;
import org.openftc.easyopencv.OpenCvWebcamFactory;
import org.opencv.core.Mat;
import org.opencv.core.Scalar;
import org.opencv.imgproc.Imgproc;

@TeleOp(name = "EasyOpenCV Sample", group = "Test")
public class EasyOpenCvSampleOpMode extends LinearOpMode {
    private OpenCvWebcam webcam;

    @Override
    public void runOpMode() {
        SamplePipeline pipeline = new SamplePipeline();
        webcam = OpenCvWebcamFactory.getInstance()
                .createWebcam(hardwareMap.get(WebcamName.class, "Webcam 1"), pipeline);
        webcam.openCameraDeviceAsync();
        FtcDashboard.getInstance().startCameraStream(webcam);
        waitForStart();
        while (opModeIsActive()) {
            telemetry.addData("FPS", pipeline.getFps());
            telemetry.update();
        }
    }

    public static class SamplePipeline extends OpenCvPipeline {
        @Config
        public static double threshold = 100.0;

        @Override
        public Mat processFrame(Mat input) {
            Imgproc.cvtColor(input, input, Imgproc.COLOR_RGB2GRAY);
            return input;
        }
    }
}
