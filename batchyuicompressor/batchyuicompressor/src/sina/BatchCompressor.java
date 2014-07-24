package sina;

import java.io.File;
import java.io.FileInputStream;
import java.io.FileOutputStream;
import java.io.IOException;
import java.io.InputStreamReader;
import java.io.OutputStreamWriter;
import java.io.Reader;
import java.io.Writer;
import java.nio.channels.FileChannel;

import org.mozilla.javascript.EvaluatorException;
import org.mozilla.javascript.ErrorReporter;

import com.yahoo.platform.yui.compressor.CssCompressor;
import com.yahoo.platform.yui.compressor.JavaScriptCompressor;

/**
 * 代码修改自YUI Compressor（BSD开源协议）;其中Mozilla Rhino 使用MPL开源协议 批量压缩js和（或）css
 * ,支持嵌套文件夹.
 * 
 * 使用: java -jar batchyuicompressor.jar
 * 
 * @author newdongyuwei@gmail.com|yuwei@staff.sina.com.cn
 * */

public class BatchCompressor {
	public static void main(String[] args) throws EvaluatorException,
			IOException {
		if (args.length != 3) {
			usage();
			System.exit(0);
		} else {
			String InputDir = args[0];
			String OutputDir = args[1];

			String obfuscate = args[2];
			boolean munge = false;
			if (obfuscate != null) {
				if (obfuscate.trim().toLowerCase().equals("true")) {
					munge = true;
				}
			}

			System.out
					.println("\n-----------------------------------------------------------------------------\n"
							+ "input directory: "
							+ InputDir
							+ "\n"
							+ "output directory: "
							+ OutputDir
							+ "\n"
							+ "obfuscate(javascript)："
							+ munge
							+ "\n"
							+ "\n-----------------------------------------------------------------------------\n");

			
			compressAll(InputDir.trim(), OutputDir.trim(), munge);
			

		}
	}

	/**
	 * 压缩所有js和css
	 * 
	 * @param inputDirPath
	 * @param outputDirPath
	 * @param munge
	 *            :是否混淆(默认应该不混淆)
	 */
	public static void compressAll(String inputDirPath, String outputDirPath,
			boolean munge) throws EvaluatorException, IOException {
		File folder = new File(inputDirPath);
		if (folder.exists()) {
			System.out.println("\n***************** start compress   **************************\n");
			recurseCompress(folder, inputDirPath, outputDirPath, munge);
			System.out.println("\n****************** end compress   ***************************\n");
		}
	}

	/**
	 * 递归压缩js或者css
	 * 
	 * @param folder
	 * @param inputDirPath
	 * @param outputDirPath
	 * @param munge
	 *            :是否混淆
	 * @param type
	 *            :"js" or "css"
	 */
	private static void recurseCompress(File folder, String inputDirPath,
			String outputDirPath, boolean munge)
			throws IOException {

		File[] listOfFiles = folder.listFiles();
		for (int i = 0; i < listOfFiles.length; i++) {
			if (listOfFiles[i].isFile()) {
				String inputFile = listOfFiles[i].getAbsolutePath();
				String outputFile = inputFile.replace(inputDirPath,
						outputDirPath);
				File target = new File(outputFile);
				if(!target.exists()){
					File parent = new File(target.getAbsolutePath().replace(
							target.getName(), ""));
					
					if (parent.canWrite()) {
						parent.mkdirs();
					} else {
						throw new Error("\n[ERROR] " + " 没有目录写权限: "
								+ parent.getAbsolutePath());
					}

					if (target.getName().endsWith(".js") || target.getName().endsWith(".css") ) {
						target.createNewFile();
					}

					if (target.getName().endsWith("js")) {
						compressOneJS(inputFile, outputFile, munge);
					} else if (target.getName().endsWith("css")) {
						compressOneCSS(inputFile, outputFile);
					}else{
						copyFile(listOfFiles[i], target);
					}
				}else{
					if (target.getName().endsWith("js")) {
						compressOneJS(inputFile, outputFile, munge);
					} else if (target.getName().endsWith("css")) {
						compressOneCSS(inputFile, outputFile);
					}else{
						copyFile(listOfFiles[i], target);
					}
					
				}
				
			} else if (listOfFiles[i].isDirectory()) {
				File target = new File(listOfFiles[i].getAbsolutePath().replace(inputDirPath, outputDirPath));
				if (!target.exists()) {
					target.mkdirs();// 递归创建目录，类似 "mkdir -p" shell 命令
				}
				recurseCompress(listOfFiles[i], inputDirPath, outputDirPath,
						munge);
			}
		}
	}
	
	/**
	 * 压缩一个js
	 * 
	 * @param inputFileName
	 * @param outputFileName
	 * @param munge
	 */
	private static void compressOneJS(final String inputFileName,
			String outputFileName, boolean munge) throws EvaluatorException,
			IOException {
		System.out.println("compress js : " + inputFileName);
		Reader in = new InputStreamReader(new FileInputStream(inputFileName),
				"UTF-8");
		JavaScriptCompressor compressor = new JavaScriptCompressor(in,
				new ErrorReporter() {
					public void warning(String message, String sourceName,
							int line, String lineSource, int lineOffset) {
						if (line < 0) {
							System.err.println("\n[WARNING] " + message);
						} else {
							System.err.println("\n[WARNING] " + line + ':'
									+ lineOffset + ':' + message);
						}
					}

					public void error(String message, String sourceName,
							int line, String lineSource, int lineOffset) {
						if (line < 0) {
							throw new Error("\n[ERROR] " + message + " 出错文件是: "
									+ inputFileName);
						} else {
							throw new Error("\n[ERROR] 文件" + inputFileName
									+ "第" + line + "行出错:" + message);
						}
					}

					public EvaluatorException runtimeError(String message,
							String sourceName, int line, String lineSource,
							int lineOffset) {
						error(message, sourceName, line, lineSource, lineOffset);
						return new EvaluatorException(message);
					}
				});

		in.close();
		in = null;

		Writer out = new OutputStreamWriter(
				new FileOutputStream(outputFileName), "UTF-8");

		// boolean munge = true;//混淆
		boolean preserveAllSemiColons = false;
		boolean disableOptimizations = false;
		boolean verbose = false;// 关闭详细信息（因为可能有大量警告信息）
		int linebreakpos = -1;// 无断行
		compressor.compress(out, linebreakpos, munge, verbose,
				preserveAllSemiColons, disableOptimizations);
		out.close();
	}

	/**
	 * 压缩一个css
	 * 
	 * @param inputFileName
	 * @param outputFileName
	 */
	private static void compressOneCSS(String inputFileName,
			String outputFileName) throws IOException {
		Reader in = new InputStreamReader(new FileInputStream(inputFileName),
				"UTF-8");
		CssCompressor compressor = new CssCompressor(in);
		in.close();
		in = null;

		Writer out = new OutputStreamWriter(
				new FileOutputStream(outputFileName), "UTF-8");
		int linebreakpos = -1;
		System.out.println("compress css: " + inputFileName);
		compressor.compress(out, linebreakpos);
		out.close();
	}

	public static void copyFile(File in, File out) throws IOException {
		System.out.println("    ---copy file---: " + in.getAbsolutePath());
		FileChannel inChannel = new FileInputStream(in).getChannel();
		FileChannel outChannel = new FileOutputStream(out).getChannel();
		try {
			inChannel.transferTo(0, inChannel.size(), outChannel);
		} catch (IOException e) {
			throw e;
		} finally {
			if (inChannel != null)
				inChannel.close();
			if (outChannel != null)
				outChannel.close();
		}
	}

	private static void usage() {
		System.out
				.println("\nUsage: java -jar batchyuicompressor.jar [input directory] [output directory] [obfuscate = true|false]\n"
						+ "for example: java -jar batchyuicompressor.jar /opt/input /opt/output false \n");
	}
}